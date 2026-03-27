import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

import {
  ensureRuntimeDirectories,
  getProjectRootPath,
  getRuntimeAgentsRootPath,
  getRuntimeDataRootPath,
  getRuntimeGlobalsRootPath,
  getRuntimeRootPath,
} from '../src/lib/runtime-paths';

type MigrationOptions = {
  dryRun: boolean;
  verbose: boolean;
};

type MovePlan = {
  from: string;
  to: string;
  type: 'copy-remove' | 'skip';
  reason?: string;
};

type AgentHomeUpdate = {
  id: number;
  oldHome: string;
  newHome: string;
};

function log(message: string, options: MigrationOptions) {
  if (options.verbose) {
    console.log(message);
  }
}

function parseArgs(argv: string[]): MigrationOptions {
  return {
    dryRun: argv.includes('--dry-run'),
    verbose: argv.includes('--verbose'),
  };
}

function pathExists(targetPath: string): boolean {
  return fs.existsSync(targetPath);
}

function ensureDir(targetPath: string, options: MigrationOptions) {
  if (options.dryRun) {
    log(`[dry-run] mkdir -p ${targetPath}`, options);
    return;
  }
  fs.mkdirSync(targetPath, { recursive: true });
}

function copyRemoveDirectory(plan: MovePlan, options: MigrationOptions) {
  if (!pathExists(plan.from)) {
    log(`skip move: source not found ${plan.from}`, options);
    return;
  }

  ensureDir(path.dirname(plan.to), options);

  if (pathExists(plan.to)) {
    log(`skip move: destination exists ${plan.to}`, options);
    return;
  }

  if (options.dryRun) {
    log(`[dry-run] cp -R ${plan.from} -> ${plan.to}`, options);
    log(`[dry-run] rm -rf ${plan.from}`, options);
    return;
  }

  fs.cpSync(plan.from, plan.to, { recursive: true, errorOnExist: true });
  fs.rmSync(plan.from, { recursive: true, force: true });
}

function buildMovePlans(projectRoot: string): MovePlan[] {
  return [
    {
      from: path.join(projectRoot, 'agents'),
      to: getRuntimeAgentsRootPath(),
      type: 'copy-remove',
    },
    {
      from: path.join(projectRoot, 'globals'),
      to: getRuntimeGlobalsRootPath(),
      type: 'copy-remove',
    },
    {
      from: path.join(projectRoot, 'data'),
      to: getRuntimeDataRootPath(),
      type: 'copy-remove',
    },
    {
      from: path.join(projectRoot, 'logs'),
      to: getRuntimeRootPath('logs'),
      type: 'copy-remove',
    },
  ];
}

function normalizeLegacyAgentHome(home: string, projectRoot: string): string {
  const legacyAgentsRoot = path.join(projectRoot, 'agents');
  const normalizedHome = path.resolve(home);

  if (normalizedHome.startsWith(legacyAgentsRoot + path.sep)) {
    const relative = path.relative(legacyAgentsRoot, normalizedHome);
    return getRuntimeAgentsRootPath(relative);
  }

  return home;
}

function collectAgentHomeUpdates(dbPath: string, projectRoot: string): AgentHomeUpdate[] {
  if (!pathExists(dbPath)) {
    return [];
  }

  const sqlite = new Database(dbPath, { readonly: true });
  try {
    const rows = sqlite.prepare('SELECT id, home FROM agents').all() as Array<{
      id: number;
      home: string;
    }>;

    return rows
      .map((row) => {
        const newHome = normalizeLegacyAgentHome(row.home, projectRoot);
        return { id: row.id, oldHome: row.home, newHome };
      })
      .filter((row) => row.oldHome !== row.newHome);
  } finally {
    sqlite.close();
  }
}

function applyAgentHomeUpdates(
  dbPath: string,
  updates: AgentHomeUpdate[],
  options: MigrationOptions,
) {
  if (updates.length === 0) {
    return;
  }

  if (options.dryRun) {
    for (const update of updates) {
      log(`[dry-run] UPDATE agents SET home='${update.newHome}' WHERE id=${update.id}`, options);
    }
    return;
  }

  const sqlite = new Database(dbPath);
  try {
    const updateStmt = sqlite.prepare('UPDATE agents SET home = ? WHERE id = ?');
    const tx = sqlite.transaction((rows: AgentHomeUpdate[]) => {
      for (const row of rows) {
        updateStmt.run(row.newHome, row.id);
      }
    });
    tx(updates);
  } finally {
    sqlite.close();
  }
}

function validateRuntimeLayout(options: MigrationOptions) {
  const required = [
    getRuntimeAgentsRootPath(),
    getRuntimeGlobalsRootPath(),
    getRuntimeDataRootPath(),
    getRuntimeRootPath('logs'),
  ];

  for (const dir of required) {
    if (!pathExists(dir)) {
      throw new Error(`runtime directory missing after migration: ${dir}`);
    }
    log(`validated directory: ${dir}`, options);
  }
}

function printLaunchdReinstallInstructions() {
  console.log('\n[launchd] Reinstall required services for migrated agents:');
  console.log('1) Open Hermes Agents WebApp');
  console.log('2) For each agent: launchd -> uninstall -> install -> start');
  console.log('   This regenerates plist with runtime/globals/.env and runtime/agents/* paths.');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const projectRoot = getProjectRootPath();

  console.log('[migrate-runtime] starting migration');
  console.log(`[migrate-runtime] project root: ${projectRoot}`);
  console.log(`[migrate-runtime] dry-run: ${options.dryRun}`);

  ensureRuntimeDirectories();

  const plans = buildMovePlans(projectRoot);
  for (const plan of plans) {
    if (plan.type === 'copy-remove') {
      copyRemoveDirectory(plan, options);
    }
  }

  const dbPath = getRuntimeDataRootPath('app.db');
  const updates = collectAgentHomeUpdates(dbPath, projectRoot);
  applyAgentHomeUpdates(dbPath, updates, options);

  if (!options.dryRun) {
    validateRuntimeLayout(options);
  }

  console.log(`[migrate-runtime] updated agent homes: ${updates.length}`);
  for (const update of updates) {
    console.log(`- ${update.oldHome} -> ${update.newHome}`);
  }

  printLaunchdReinstallInstructions();
  console.log('[migrate-runtime] completed');
}

main();
