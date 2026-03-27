#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

function getProjectRootPath(...segments) {
  return path.join(process.cwd(), ...segments);
}

function getRuntimeRootPath(...segments) {
  return path.join(process.cwd(), 'runtime', ...segments);
}

function getRuntimeAgentsRootPath(...segments) {
  return getRuntimeRootPath('agents', ...segments);
}

function getRuntimeGlobalsRootPath(...segments) {
  return getRuntimeRootPath('globals', ...segments);
}

function getRuntimeDataRootPath(...segments) {
  return getRuntimeRootPath('data', ...segments);
}

function ensureRuntimeDirectories() {
  fs.mkdirSync(getRuntimeAgentsRootPath(), { recursive: true });
  fs.mkdirSync(getRuntimeGlobalsRootPath(), { recursive: true });
  fs.mkdirSync(getRuntimeDataRootPath(), { recursive: true });
  fs.mkdirSync(getRuntimeRootPath('logs'), { recursive: true });
}

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    verbose: argv.includes('--verbose'),
  };
}

function log(message, options) {
  if (options.verbose) {
    console.log(message);
  }
}

function pathExists(targetPath) {
  return fs.existsSync(targetPath);
}

function ensureDir(targetPath, options) {
  if (options.dryRun) {
    log(`[dry-run] mkdir -p ${targetPath}`, options);
    return;
  }
  fs.mkdirSync(targetPath, { recursive: true });
}

function copyRemoveDirectory(from, to, options) {
  if (!pathExists(from)) {
    log(`skip move: source not found ${from}`, options);
    return;
  }

  ensureDir(path.dirname(to), options);

  if (pathExists(to)) {
    log(`skip move: destination exists ${to}`, options);
    return;
  }

  if (options.dryRun) {
    log(`[dry-run] cp -R ${from} -> ${to}`, options);
    log(`[dry-run] rm -rf ${from}`, options);
    return;
  }

  fs.cpSync(from, to, { recursive: true, errorOnExist: true });
  fs.rmSync(from, { recursive: true, force: true });
}

function buildMovePlans(projectRoot) {
  return [
    [path.join(projectRoot, 'agents'), getRuntimeAgentsRootPath()],
    [path.join(projectRoot, 'globals'), getRuntimeGlobalsRootPath()],
    [path.join(projectRoot, 'data'), getRuntimeDataRootPath()],
    [path.join(projectRoot, 'logs'), getRuntimeRootPath('logs')],
  ];
}

function normalizeLegacyAgentHome(home, projectRoot) {
  const legacyAgentsRoot = path.join(projectRoot, 'agents');
  const normalizedHome = path.resolve(home);

  if (normalizedHome.startsWith(legacyAgentsRoot + path.sep)) {
    const relative = path.relative(legacyAgentsRoot, normalizedHome);
    return getRuntimeAgentsRootPath(relative);
  }

  return home;
}

function collectAgentHomeUpdates(dbPath, projectRoot) {
  if (!pathExists(dbPath)) {
    return [];
  }

  const sqlite = new Database(dbPath, { readonly: true });
  try {
    const rows = sqlite.prepare('SELECT id, home FROM agents').all();

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

function applyAgentHomeUpdates(dbPath, updates, options) {
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
    const tx = sqlite.transaction((rows) => {
      for (const row of rows) {
        updateStmt.run(row.newHome, row.id);
      }
    });
    tx(updates);
  } finally {
    sqlite.close();
  }
}

function validateRuntimeLayout(options) {
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
  for (const [from, to] of plans) {
    copyRemoveDirectory(from, to, options);
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
