// @vitest-environment node
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MANAGED_DISPATCH_SCRIPT_RELATIVE_PATH,
  MANAGED_DISPATCH_SKILL,
} from '../../src/lib/delegation';

const execFileAsync = promisify(execFile);

let tmpDir: string;
let agentHome: string;

vi.mock('../../src/lib/delegation', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    resolveTargetMeta: vi.fn(async (ids: string[]) =>
      ids.map((id) => ({ id, name: id, description: `desc for ${id}`, tags: ['test'] })),
    ),
  };
});

vi.mock('../../src/lib/partials', () => ({
  parsePartialReferences: () => [],
  readPartial: vi.fn(async () => null),
}));

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'delegation-sync-test-'));
  agentHome = path.join(tmpDir, 'agent-home');
  fs.mkdirSync(path.join(agentHome, 'skills'), { recursive: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('delegation-sync helpers', () => {
  it('finds only agents delegating to the target', async () => {
    const targetId = 'target-a';
    const agentsRoot = path.join(tmpDir, 'runtime', 'agents');
    const plannerHome = path.join(agentsRoot, 'planner');
    const unrelatedHome = path.join(agentsRoot, 'unrelated');
    const targetHome = path.join(agentsRoot, targetId);

    fs.mkdirSync(plannerHome, { recursive: true });
    fs.mkdirSync(unrelatedHome, { recursive: true });
    fs.mkdirSync(targetHome, { recursive: true });

    await fsp.writeFile(
      path.join(plannerHome, 'delegation.json'),
      JSON.stringify({ allowedAgents: [targetId], maxHop: 3 }),
      'utf-8',
    );
    await fsp.writeFile(
      path.join(unrelatedHome, 'delegation.json'),
      JSON.stringify({ allowedAgents: ['someone-else'], maxHop: 3 }),
      'utf-8',
    );

    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);

    const { findAgentsDelegatingTo } = await import('../../src/lib/delegation-sync');
    const dependents = await findAgentsDelegatingTo(targetId);

    expect(dependents).toEqual(['planner']);
  });

  it('refreshes SOUL.md for dependent agents only', async () => {
    const targetId = 'target-a';
    const agentsRoot = path.join(tmpDir, 'runtime', 'agents');
    const plannerHome = path.join(agentsRoot, 'planner');
    const unrelatedHome = path.join(agentsRoot, 'unrelated');
    const targetHome = path.join(agentsRoot, targetId);

    fs.mkdirSync(plannerHome, { recursive: true });
    fs.mkdirSync(unrelatedHome, { recursive: true });
    fs.mkdirSync(targetHome, { recursive: true });

    await fsp.writeFile(path.join(plannerHome, 'SOUL.src.md'), '# Planner\n', 'utf-8');
    await fsp.writeFile(path.join(plannerHome, 'SOUL.md'), '# Planner\n', 'utf-8');
    await fsp.writeFile(path.join(unrelatedHome, 'SOUL.src.md'), '# Unrelated\n', 'utf-8');
    await fsp.writeFile(path.join(unrelatedHome, 'SOUL.md'), '# Unrelated\n', 'utf-8');
    await fsp.writeFile(
      path.join(plannerHome, 'delegation.json'),
      JSON.stringify({ allowedAgents: [targetId], maxHop: 3 }),
      'utf-8',
    );
    await fsp.writeFile(
      path.join(unrelatedHome, 'delegation.json'),
      JSON.stringify({ allowedAgents: ['someone-else'], maxHop: 3 }),
      'utf-8',
    );
    await fsp.writeFile(
      path.join(targetHome, 'meta.json'),
      JSON.stringify({ name: 'Target A', description: 'updated desc', tags: ['fresh'] }),
      'utf-8',
    );

    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);

    const { refreshDependentSoulsForTarget } = await import('../../src/lib/delegation-sync');
    const rebuilt = await refreshDependentSoulsForTarget(targetId);

    expect(rebuilt).toEqual(['planner']);
    const plannerSoul = await fsp.readFile(path.join(plannerHome, 'SOUL.md'), 'utf-8');
    const unrelatedSoul = await fsp.readFile(path.join(unrelatedHome, 'SOUL.md'), 'utf-8');
    expect(plannerSoul).toContain('target-a');
    expect(plannerSoul).toContain('desc for target-a');
    expect(unrelatedSoul).toBe('# Unrelated\n');
  });
});

describe('syncDelegationForAgent', () => {
  it('equips managed skill when allowedAgents non-empty', async () => {
    await fsp.writeFile(path.join(agentHome, 'SOUL.src.md'), '# Soul\n', 'utf-8');
    await fsp.writeFile(path.join(agentHome, 'SOUL.md'), '# Soul\n', 'utf-8');

    const { syncDelegationForAgent } = await import('../../src/lib/delegation-sync');
    await syncDelegationForAgent('test-agent', agentHome, {
      allowedAgents: ['target-a'],
      maxHop: 3,
    });

    const skillDir = path.join(agentHome, 'skills', MANAGED_DISPATCH_SKILL);
    expect(fs.existsSync(path.join(skillDir, 'SKILL.md'))).toBe(true);
    const skillContent = await fsp.readFile(path.join(skillDir, 'SKILL.md'), 'utf-8');
    expect(skillContent).toContain('dispatch-subagent.sh');
    expect(skillContent).toContain(
      'Use the script instead of manually constructing curl payloads yourself.',
    );
    expect(fs.existsSync(path.join(skillDir, MANAGED_DISPATCH_SCRIPT_RELATIVE_PATH))).toBe(true);
  });

  it('regenerates SOUL.md with delegation block', async () => {
    await fsp.writeFile(path.join(agentHome, 'SOUL.src.md'), '# Soul\n', 'utf-8');
    await fsp.writeFile(path.join(agentHome, 'SOUL.md'), '# Soul\n', 'utf-8');
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'name: test-agent\n', 'utf-8');

    const { syncDelegationForAgent } = await import('../../src/lib/delegation-sync');
    await syncDelegationForAgent('test-agent', agentHome, {
      allowedAgents: ['target-a'],
      maxHop: 3,
    });

    const soulContent = await fsp.readFile(path.join(agentHome, 'SOUL.md'), 'utf-8');
    expect(soulContent).toContain('HERMES_MANAGER_SUBAGENTS_V1_BEGIN');
    expect(soulContent).toContain('target-a');
  });

  it('bundled dispatch script derives source agent from HERMES_HOME', async () => {
    await fsp.writeFile(path.join(agentHome, 'SOUL.src.md'), '# Soul\n', 'utf-8');
    await fsp.writeFile(path.join(agentHome, 'SOUL.md'), '# Soul\n', 'utf-8');
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'name: test-agent\n', 'utf-8');

    const { syncDelegationForAgent } = await import('../../src/lib/delegation-sync');
    await syncDelegationForAgent('test-agent', agentHome, {
      allowedAgents: ['target-a'],
      maxHop: 3,
    });

    const scriptPath = path.join(
      agentHome,
      'skills',
      MANAGED_DISPATCH_SKILL,
      MANAGED_DISPATCH_SCRIPT_RELATIVE_PATH,
    );
    const scriptContent = await fsp.readFile(scriptPath, 'utf-8');
    expect(scriptContent).toContain('${HERMES_HOME:-}');
    expect(scriptContent).toContain('basename -- "$HERMES_HOME"');
    expect(scriptContent).toContain('${HERMES_MANAGER_BASE_URL:-http://127.0.0.1:18470}');
  });

  it('bundled dispatch script fails clearly when HERMES_HOME is missing', async () => {
    await fsp.writeFile(path.join(agentHome, 'SOUL.src.md'), '# Soul\n', 'utf-8');
    await fsp.writeFile(path.join(agentHome, 'SOUL.md'), '# Soul\n', 'utf-8');
    await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'name: test-agent\n', 'utf-8');

    const { syncDelegationForAgent } = await import('../../src/lib/delegation-sync');
    await syncDelegationForAgent('test-agent', agentHome, {
      allowedAgents: ['target-a'],
      maxHop: 3,
    });

    const scriptPath = path.join(
      agentHome,
      'skills',
      MANAGED_DISPATCH_SKILL,
      MANAGED_DISPATCH_SCRIPT_RELATIVE_PATH,
    );
    await expect(
      execFileAsync(scriptPath, ['target-a'], {
        env: { ...process.env, HERMES_HOME: '' },
      }),
    ).rejects.toMatchObject({
      code: 66,
      stderr: expect.stringContaining('HERMES_HOME is not set'),
    });
  });

  it('removes delegation block from SOUL.md when allowedAgents empty', async () => {
    const soulWithBlock = [
      '# Soul',
      '',
      '<!-- HERMES_MANAGER_SUBAGENTS_V1_BEGIN -->',
      'old block',
      '<!-- HERMES_MANAGER_SUBAGENTS_V1_END -->',
    ].join('\n');
    await fsp.writeFile(path.join(agentHome, 'SOUL.src.md'), '# Soul\n', 'utf-8');
    await fsp.writeFile(path.join(agentHome, 'SOUL.md'), soulWithBlock, 'utf-8');

    const { syncDelegationForAgent } = await import('../../src/lib/delegation-sync');
    await syncDelegationForAgent('test-agent', agentHome, {
      allowedAgents: [],
      maxHop: 3,
    });

    const soulContent = await fsp.readFile(path.join(agentHome, 'SOUL.md'), 'utf-8');
    expect(soulContent).not.toContain('HERMES_MANAGER_SUBAGENTS_V1');
  });
});

describe('refreshDependentSoulsForTarget', () => {
  it('rebuilds SOUL.md for each dependent agent', async () => {
    const agentsRoot = path.join(tmpDir, 'runtime', 'agents');
    const dep1Home = path.join(agentsRoot, 'dep1');
    const dep2Home = path.join(agentsRoot, 'dep2');
    const targetHome = path.join(agentsRoot, 'target01');
    fs.mkdirSync(dep1Home, { recursive: true });
    fs.mkdirSync(dep2Home, { recursive: true });
    fs.mkdirSync(targetHome, { recursive: true });

    await fsp.writeFile(path.join(dep1Home, 'SOUL.src.md'), '# Dep1 Soul\n', 'utf-8');
    await fsp.writeFile(path.join(dep1Home, 'SOUL.md'), '# Dep1 Soul\n', 'utf-8');
    await fsp.writeFile(
      path.join(dep1Home, 'dispatch.json'),
      JSON.stringify({ allowedAgents: ['target01'], maxHop: 3 }),
    );

    await fsp.writeFile(path.join(dep2Home, 'SOUL.src.md'), '# Dep2 Soul\n', 'utf-8');
    await fsp.writeFile(path.join(dep2Home, 'SOUL.md'), '# Dep2 Soul\n', 'utf-8');
    await fsp.writeFile(
      path.join(dep2Home, 'dispatch.json'),
      JSON.stringify({ allowedAgents: ['target01'], maxHop: 3 }),
    );

    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);

    const runtimePaths = await import('../../src/lib/runtime-paths');
    vi.spyOn(runtimePaths, 'getRuntimeAgentsRootPath').mockImplementation((...segments: string[]) =>
      path.join(agentsRoot, ...segments),
    );

    const { refreshDependentSoulsForTarget } = await import('../../src/lib/delegation-sync');
    const rebuilt = await refreshDependentSoulsForTarget('target01');

    expect(rebuilt.sort()).toEqual(['dep1', 'dep2']);
    const soul1 = await fsp.readFile(path.join(dep1Home, 'SOUL.md'), 'utf-8');
    const soul2 = await fsp.readFile(path.join(dep2Home, 'SOUL.md'), 'utf-8');
    expect(soul1).toContain('HERMES_MANAGER_SUBAGENTS_V1_BEGIN');
    expect(soul1).toContain('target01');
    expect(soul2).toContain('HERMES_MANAGER_SUBAGENTS_V1_BEGIN');
    expect(soul2).toContain('target01');
  });

  it('does nothing when no dependents exist', async () => {
    const agentsRoot = path.join(tmpDir, 'runtime', 'agents');
    fs.mkdirSync(agentsRoot, { recursive: true });

    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);

    const runtimePaths = await import('../../src/lib/runtime-paths');
    vi.spyOn(runtimePaths, 'getRuntimeAgentsRootPath').mockImplementation((...segments: string[]) =>
      path.join(agentsRoot, ...segments),
    );

    const { refreshDependentSoulsForTarget } = await import('../../src/lib/delegation-sync');
    const rebuilt = await refreshDependentSoulsForTarget('nonexistent');
    expect(rebuilt).toEqual([]);
  });
});
