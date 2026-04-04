import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => {
  const execFile = vi.fn((...args: unknown[]) => {
    const maybeCallback = args.at(-1);
    if (typeof maybeCallback === 'function') {
      (maybeCallback as (err: Error | null, stdout?: string, stderr?: string) => void)(
        new Error('command unavailable'),
        '',
        '',
      );
    }
  });

  return {
    execFile,
    default: { execFile },
  };
});

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-lib-test-'));
  vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('listAgents', () => {
  it('returns empty array when no agents exist', async () => {
    await fsp.mkdir(path.join(tmpDir, 'runtime', 'agents'), { recursive: true });
    const { listAgents } = await import('../../src/lib/agents');
    const agents = await listAgents();
    expect(agents).toEqual([]);
  });

  it('returns agents that have config.yaml', async () => {
    const agentDir = path.join(tmpDir, 'runtime', 'agents', 'test-agent');
    await fsp.mkdir(agentDir, { recursive: true });
    await fsp.writeFile(path.join(agentDir, 'config.yaml'), 'enabled: true\n');

    const { listAgents } = await import('../../src/lib/agents');
    const agents = await listAgents();
    expect(agents).toHaveLength(1);
    expect(agents[0].agentId).toBe('test-agent');
    expect(agents[0].label).toBe('ai.hermes.gateway.test-agent');
    expect(agents[0].enabled).toBe(true);
    expect(agents[0].name).toBe('');
    expect(agents[0].description).toBe('');
    expect(agents[0].tags).toEqual([]);
    expect(agents[0].memoryRssBytes).toBeNull();
    expect(agents[0].hermesVersion).toBeNull();
  });

  it('reads metadata from meta.json when present', async () => {
    const agentDir = path.join(tmpDir, 'runtime', 'agents', 'meta-agent');
    await fsp.mkdir(agentDir, { recursive: true });
    await fsp.writeFile(path.join(agentDir, 'config.yaml'), 'enabled: false\n');
    await fsp.writeFile(
      path.join(agentDir, 'meta.json'),
      JSON.stringify({ name: 'Bot A', description: 'テスト用', tags: ['dev'] }),
    );

    const { getAgent } = await import('../../src/lib/agents');
    const agent = await getAgent('meta-agent');
    expect(agent).not.toBeNull();
    expect(agent!.name).toBe('Bot A');
    expect(agent!.description).toBe('テスト用');
    expect(agent!.tags).toEqual(['dev']);
  });

  it('skips directories without config.yaml', async () => {
    const agentDir = path.join(tmpDir, 'runtime', 'agents', 'no-config');
    await fsp.mkdir(agentDir, { recursive: true });

    const { listAgents } = await import('../../src/lib/agents');
    const agents = await listAgents();
    expect(agents).toHaveLength(0);
  });
});

describe('getAgent', () => {
  it('returns agent when directory and config.yaml exist', async () => {
    const agentDir = path.join(tmpDir, 'runtime', 'agents', 'my-agent');
    await fsp.mkdir(agentDir, { recursive: true });
    await fsp.writeFile(path.join(agentDir, 'config.yaml'), 'name: default\n');

    const { getAgent } = await import('../../src/lib/agents');
    const agent = await getAgent('my-agent');
    expect(agent).not.toBeNull();
    expect(agent!.agentId).toBe('my-agent');
    expect(agent!.home).toBe(agentDir);
    expect(agent!.enabled).toBe(false);
    expect(agent!.memoryRssBytes).toBeNull();
    expect(agent!.hermesVersion).toBeNull();
  });

  it('returns null for nonexistent agent', async () => {
    await fsp.mkdir(path.join(tmpDir, 'runtime', 'agents'), { recursive: true });
    const { getAgent } = await import('../../src/lib/agents');
    const agent = await getAgent('nonexistent');
    expect(agent).toBeNull();
  });
});

describe('createAgent', () => {
  it('creates agent directory with all scaffold files', async () => {
    await fsp.mkdir(path.join(tmpDir, 'runtime', 'agents'), { recursive: true });
    const { createAgent } = await import('../../src/lib/agents');
    const agent = await createAgent('new-agent', {
      memoryMd: '# Memory\n',
      userMd: '# User\n',
      soulMd: '# Soul\n',
      configYaml: 'name: default\n',
    });

    expect(agent.agentId).toBe('new-agent');
    const home = agent.home;
    expect(fs.existsSync(path.join(home, 'memories', 'MEMORY.md'))).toBe(true);
    expect(fs.existsSync(path.join(home, 'memories', 'USER.md'))).toBe(true);
    expect(fs.existsSync(path.join(home, 'SOUL.md'))).toBe(true);
    expect(fs.existsSync(path.join(home, 'config.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(home, '.env'))).toBe(true);
    expect(fs.existsSync(path.join(home, 'logs'))).toBe(true);
  });
});

describe('deleteAgent', () => {
  it('removes agent directory', async () => {
    const agentDir = path.join(tmpDir, 'runtime', 'agents', 'to-delete');
    await fsp.mkdir(agentDir, { recursive: true });
    await fsp.writeFile(path.join(agentDir, 'config.yaml'), 'name: default\n');

    const { deleteAgent } = await import('../../src/lib/agents');
    await deleteAgent('to-delete');
    expect(fs.existsSync(agentDir)).toBe(false);
  });
});
