// @vitest-environment node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MANAGED_DISPATCH_SKILL } from '../../src/lib/delegation';

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
  });

  it('removes managed skill when allowedAgents empty', async () => {
    const skillDir = path.join(agentHome, 'skills', MANAGED_DISPATCH_SKILL);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Skill\n');

    await fsp.writeFile(path.join(agentHome, 'SOUL.src.md'), '# Soul\n', 'utf-8');
    await fsp.writeFile(path.join(agentHome, 'SOUL.md'), '# Soul\n', 'utf-8');

    const { syncDelegationForAgent } = await import('../../src/lib/delegation-sync');
    await syncDelegationForAgent('test-agent', agentHome, {
      allowedAgents: [],
      maxHop: 3,
    });

    expect(fs.existsSync(skillDir)).toBe(false);
  });

  it('does not duplicate managed skill on second sync', async () => {
    await fsp.writeFile(path.join(agentHome, 'SOUL.src.md'), '# Soul\n', 'utf-8');
    await fsp.writeFile(path.join(agentHome, 'SOUL.md'), '# Soul\n', 'utf-8');

    const { syncDelegationForAgent } = await import('../../src/lib/delegation-sync');
    const policy = { allowedAgents: ['target-a'], maxHop: 3 };
    await syncDelegationForAgent('test-agent', agentHome, policy);
    await syncDelegationForAgent('test-agent', agentHome, policy);

    const skillDir = path.join(agentHome, 'skills', MANAGED_DISPATCH_SKILL);
    expect(fs.existsSync(path.join(skillDir, 'SKILL.md'))).toBe(true);
  });

  it('regenerates SOUL.md with delegation block', async () => {
    await fsp.writeFile(path.join(agentHome, 'SOUL.src.md'), '# Soul\n', 'utf-8');
    await fsp.writeFile(path.join(agentHome, 'SOUL.md'), '# Soul\n', 'utf-8');

    const { syncDelegationForAgent } = await import('../../src/lib/delegation-sync');
    await syncDelegationForAgent('test-agent', agentHome, {
      allowedAgents: ['target-a'],
      maxHop: 3,
    });

    const soulContent = await fsp.readFile(path.join(agentHome, 'SOUL.md'), 'utf-8');
    expect(soulContent).toContain('HERMES_MANAGER_SUBAGENTS_V1_BEGIN');
    expect(soulContent).toContain('target-a');
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
