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
      soulSrcMd: '# Soul\n',
      configYaml: 'name: default\n',
    });

    expect(agent.agentId).toBe('new-agent');
    const home = agent.home;
    expect(fs.existsSync(path.join(home, 'memories', 'MEMORY.md'))).toBe(true);
    expect(fs.existsSync(path.join(home, 'memories', 'USER.md'))).toBe(true);
    expect(fs.existsSync(path.join(home, 'SOUL.src.md'))).toBe(true);
    expect(fs.existsSync(path.join(home, 'SOUL.md'))).toBe(true);
    expect(fs.existsSync(path.join(home, 'config.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(home, '.env'))).toBe(true);
    expect(fs.existsSync(path.join(home, 'logs'))).toBe(true);
  });
});

describe('createAgent with meta', () => {
  it('persists apiServerPort in meta.json when in valid range', async () => {
    await fsp.mkdir(path.join(tmpDir, 'runtime', 'agents'), { recursive: true });
    const { createAgent } = await import('../../src/lib/agents');
    const agent = await createAgent(
      'port-agent',
      {
        memoryMd: '# Memory\n',
        userMd: '# User\n',
        soulSrcMd: '# Soul\n',
        configYaml: 'name: default\n',
      },
      { name: 'PortBot', apiServerPort: 8650 },
    );

    expect(agent.agentId).toBe('port-agent');
    expect(agent.name).toBe('PortBot');

    const metaRaw = fs.readFileSync(path.join(agent.home, 'meta.json'), 'utf-8');
    const meta = JSON.parse(metaRaw);
    expect(meta.apiServerPort).toBe(8650);
  });

  it('ignores out-of-range apiServerPort', async () => {
    await fsp.mkdir(path.join(tmpDir, 'runtime', 'agents'), { recursive: true });
    const { createAgent } = await import('../../src/lib/agents');
    const agent = await createAgent(
      'bad-port',
      {
        memoryMd: '# M\n',
        userMd: '# U\n',
        soulSrcMd: '# S\n',
        configYaml: 'name: default\n',
      },
      { apiServerPort: 9999 },
    );

    expect(fs.existsSync(path.join(agent.home, 'meta.json'))).toBe(false);
  });
});

describe('updateAgentMeta', () => {
  it('updates meta.json and preserves existing port when new port is out of range', async () => {
    const agentDir = path.join(tmpDir, 'runtime', 'agents', 'update-me');
    await fsp.mkdir(agentDir, { recursive: true });
    await fsp.writeFile(path.join(agentDir, 'config.yaml'), 'enabled: true\n');
    await fsp.writeFile(
      path.join(agentDir, 'meta.json'),
      JSON.stringify({ name: 'Old', description: '', tags: [], apiServerPort: 8645 }),
    );

    const { updateAgentMeta } = await import('../../src/lib/agents');
    const result = await updateAgentMeta('update-me', {
      name: 'New',
      description: 'Updated',
      tags: ['prod'],
      apiServerPort: null,
    });

    expect(result).not.toBeNull();
    expect(result!.name).toBe('New');
    expect(result!.description).toBe('Updated');
    expect(result!.tags).toEqual(['prod']);
    expect(result!.apiServerPort).toBe(8645);
  });

  it('refreshes dependent generated SOUL when updated agent is referenced by delegation', async () => {
    const targetDir = path.join(tmpDir, 'runtime', 'agents', 'target-agent');
    const plannerDir = path.join(tmpDir, 'runtime', 'agents', 'planner01');
    const unrelatedDir = path.join(tmpDir, 'runtime', 'agents', 'unrelated01');

    await fsp.mkdir(targetDir, { recursive: true });
    await fsp.mkdir(plannerDir, { recursive: true });
    await fsp.mkdir(unrelatedDir, { recursive: true });

    await fsp.writeFile(path.join(targetDir, 'config.yaml'), 'enabled: true\n');
    await fsp.writeFile(
      path.join(targetDir, 'meta.json'),
      JSON.stringify({ name: 'Old Target', description: 'old desc', tags: ['stale'] }),
    );

    await fsp.writeFile(path.join(plannerDir, 'config.yaml'), 'enabled: true\n');
    await fsp.writeFile(path.join(plannerDir, 'SOUL.src.md'), '# Planner\n', 'utf-8');
    await fsp.writeFile(path.join(plannerDir, 'SOUL.md'), '# Planner\n', 'utf-8');
    await fsp.writeFile(
      path.join(plannerDir, 'delegation.json'),
      JSON.stringify({ allowedAgents: ['target-agent'], maxHop: 3 }),
      'utf-8',
    );

    await fsp.writeFile(path.join(unrelatedDir, 'config.yaml'), 'enabled: true\n');
    await fsp.writeFile(path.join(unrelatedDir, 'SOUL.src.md'), '# Unrelated\n', 'utf-8');
    await fsp.writeFile(path.join(unrelatedDir, 'SOUL.md'), '# Unrelated\n', 'utf-8');
    await fsp.writeFile(
      path.join(unrelatedDir, 'delegation.json'),
      JSON.stringify({ allowedAgents: ['someone-else'], maxHop: 3 }),
      'utf-8',
    );

    const { updateAgentMeta } = await import('../../src/lib/agents');
    const result = await updateAgentMeta('target-agent', {
      name: 'Fresh Target',
      description: 'fresh desc',
      tags: ['fresh'],
    });

    expect(result).not.toBeNull();
    const plannerSoul = await fsp.readFile(path.join(plannerDir, 'SOUL.md'), 'utf-8');
    const unrelatedSoul = await fsp.readFile(path.join(unrelatedDir, 'SOUL.md'), 'utf-8');
    expect(plannerSoul).toContain('Fresh Target');
    expect(plannerSoul).toContain('fresh desc');
    expect(unrelatedSoul).toBe('# Unrelated\n');
  });

  it('returns null for nonexistent agent', async () => {
    await fsp.mkdir(path.join(tmpDir, 'runtime', 'agents'), { recursive: true });
    const { updateAgentMeta } = await import('../../src/lib/agents');
    const result = await updateAgentMeta('ghost', {
      name: 'X',
      description: '',
      tags: [],
    });
    expect(result).toBeNull();
  });
});

describe('Agent DTO shape', () => {
  it('listAgents and getAgent produce identical shape', async () => {
    const agentDir = path.join(tmpDir, 'runtime', 'agents', 'shape-check');
    await fsp.mkdir(agentDir, { recursive: true });
    await fsp.writeFile(path.join(agentDir, 'config.yaml'), 'enabled: true\n');
    await fsp.writeFile(
      path.join(agentDir, 'meta.json'),
      JSON.stringify({ name: 'ShapeBot', description: 'desc', tags: ['a'], apiServerPort: 8643 }),
    );

    const { listAgents, getAgent } = await import('../../src/lib/agents');
    const [listed] = await listAgents();
    const single = await getAgent('shape-check');

    expect(listed).toBeTruthy();
    expect(single).toBeTruthy();

    const expectedKeys = [
      'agentId',
      'home',
      'label',
      'enabled',
      'createdAt',
      'updatedAt',
      'name',
      'description',
      'tags',
      'apiServerStatus',
      'apiServerStatusReason',
      'apiServerAvailable',
      'apiServerPort',
      'memoryRssBytes',
      'hermesVersion',
    ];
    for (const key of expectedKeys) {
      expect(listed).toHaveProperty(key);
      expect(single).toHaveProperty(key);
    }

    expect(listed!.agentId).toBe(single!.agentId);
    expect(listed!.label).toBe(single!.label);
    expect(listed!.enabled).toBe(single!.enabled);
    expect(listed!.name).toBe(single!.name);
    expect(listed!.apiServerPort).toBe(single!.apiServerPort);
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
