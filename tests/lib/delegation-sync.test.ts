// @vitest-environment node
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MANAGED_DISPATCH_SCRIPT_NAME, MANAGED_DISPATCH_SKILL } from '../../src/lib/delegation';

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
    expect(fs.existsSync(path.join(skillDir, 'dispatch-subagent.sh'))).toBe(true);
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
      MANAGED_DISPATCH_SCRIPT_NAME,
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
      MANAGED_DISPATCH_SCRIPT_NAME,
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
