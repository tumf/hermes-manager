// @vitest-environment node
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- hoisted mock state ---
const mockState = vi.hoisted(() => ({
  agents: [] as Agent[],
  createdAgent: null as Agent | null,
}));

// --- mock @/src/lib/agents ---
vi.mock('@/src/lib/agents', () => ({
  listAgents: vi.fn(async () => mockState.agents),
  getAgent: vi.fn(async (id: string) => mockState.agents.find((a) => a.agentId === id) ?? null),
  agentExists: vi.fn(async (id: string) => mockState.agents.some((a) => a.agentId === id)),
  allocateApiServerPort: vi.fn(async () => 8642),
  createAgent: vi.fn(
    async (agentId: string, _files: unknown, meta?: { apiServerPort?: number }) => {
      const agent: Agent = {
        agentId,
        home: `/runtime/agents/${agentId}`,
        label: `ai.hermes.gateway.${agentId}`,
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: '',
        description: '',
        tags: [],
        apiServerStatus: 'disabled',
        apiServerAvailable: false,
        apiServerPort: meta?.apiServerPort ?? null,
        memoryRssBytes: null,
        hermesVersion: null,
      };
      mockState.createdAgent = agent;
      return agent;
    },
  ),
  updateAgentMeta: vi.fn(
    async (
      agentId: string,
      meta: { name: string; description: string; tags: string[]; apiServerPort?: number | null },
    ) => {
      const agent = mockState.agents.find((a) => a.agentId === agentId);
      if (!agent) return null;
      agent.name = meta.name;
      agent.description = meta.description;
      agent.tags = meta.tags;
      if (typeof meta.apiServerPort === 'number') {
        agent.apiServerPort = meta.apiServerPort;
      }
      return {
        name: meta.name,
        description: meta.description,
        tags: meta.tags,
        apiServerPort: agent.apiServerPort,
      };
    },
  ),
  readAgentMeta: vi.fn(async (agentId: string) => {
    const agent = mockState.agents.find((a) => a.agentId === agentId);
    if (!agent) return null;
    return {
      name: agent.name,
      description: agent.description,
      tags: agent.tags,
      apiServerPort: agent.apiServerPort,
    };
  }),
  deleteAgent: vi.fn(async () => undefined),
}));

// --- mock node:fs/promises ---
vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
    rm: vi.fn().mockResolvedValue(undefined),
    cp: vi.fn().mockResolvedValue(undefined),
    stat: vi
      .fn()
      .mockResolvedValue({ isDirectory: () => true, birthtime: new Date(), mtime: new Date() }),
  },
}));

// --- mock node:child_process ---
vi.mock('node:child_process', () => ({
  execFile: vi.fn((_cmd: string, _args: string[], cb: (err: null) => void) => cb(null)),
}));

// --- mock src/lib/templates ---
vi.mock('@/src/lib/templates', () => ({
  resolveTemplateContent: vi.fn((fileName: string, agentId: string) => {
    const fallbacks: Record<string, (id: string) => string> = {
      'memories/MEMORY.md': (id: string) => `# Memory: ${id}\n`,
      'memories/USER.md': (id: string) => `# User: ${id}\n`,
      'SOUL.md': (id: string) => `# Soul: ${id}\n`,
      'config.yaml': (id: string) => `name: ${id}\n`,
    };
    return (fallbacks[fileName] ?? (() => ''))(agentId);
  }),
}));

// --- mock src/lib/id ---
vi.mock('../../src/lib/id', () => ({
  generateAgentId: vi.fn(() => 'abc1234'),
}));

// --- mock src/lib/delegation-sync ---
vi.mock('@/src/lib/delegation-sync', () => ({
  refreshDependentSoulsForTarget: vi.fn(async () => undefined),
}));

// --- mock src/lib/dotenv-parser ---
vi.mock('@/src/lib/dotenv-parser', () => ({
  clearTokenValues: vi.fn(async () => undefined),
}));

// Import handlers after mocks are set up
import { PUT as META_PUT } from '../../app/api/agents/[id]/meta/route';
import { POST as COPY_POST } from '../../app/api/agents/copy/route';
import { DELETE, GET, POST } from '../../app/api/agents/route';
import type { Agent } from '../../src/lib/agents';
import { PLATFORM_TOKEN_KEYS } from '../../src/lib/constants';
import { refreshDependentSoulsForTarget } from '../../src/lib/delegation-sync';
import { clearTokenValues } from '../../src/lib/dotenv-parser';

function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

describe('GET /api/agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agents = [];
    mockState.createdAgent = null;
  });

  it('returns empty array when no agents', async () => {
    mockState.agents = [];
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns agents list with agentId', async () => {
    mockState.agents = [
      {
        agentId: 'abc1234',
        home: '/runtime/agents/abc1234',
        label: 'ai.hermes.gateway.abc1234',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: '',
        description: '',
        tags: [],
        apiServerStatus: 'disabled',
        apiServerAvailable: false,
        apiServerPort: null,
        memoryRssBytes: null,
        hermesVersion: null,
      },
    ];
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].agentId).toBe('abc1234');
    expect(body[0].memoryRssBytes).toBeNull();
    expect(body[0].apiServerAvailable).toBe(false);
    expect(body[0].apiServerPort).toBeNull();
    expect(body[0].hermesVersion).toBeUndefined();
  });
});

describe('POST /api/agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agents = [];
    mockState.createdAgent = null;
  });

  it('creates agent without body and returns 201 with auto-generated id', async () => {
    const agentsLib = await import('../../src/lib/agents');

    const res = await POST(new NextRequest('http://localhost/api/agents', { method: 'POST' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.agentId).toBe('abc1234');
    expect(body.label).toBe('ai.hermes.gateway.abc1234');
    expect(body.apiServerPort).toBe(8642);

    expect(vi.mocked(agentsLib.createAgent)).toHaveBeenCalledWith(
      'abc1234',
      expect.objectContaining({
        soulSrcMd: '# Soul: abc1234\n',
      }),
      expect.objectContaining({ apiServerPort: 8642 }),
    );
  });

  it('returns 409 when no api server ports are available', async () => {
    const agentsLib = await import('../../src/lib/agents');
    vi.mocked(agentsLib.allocateApiServerPort).mockRejectedValueOnce(new Error('port exhausted'));

    const res = await POST(new NextRequest('http://localhost/api/agents', { method: 'POST' }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain('No available API server ports');
  });

  it('accepts templates parameter in body', async () => {
    const req = makeReq('http://localhost/api/agents', {
      method: 'POST',
      body: JSON.stringify({
        templates: {
          memoryMd: 'telegram-bot',
          userMd: 'default',
          soulMd: 'default',
          configYaml: 'custom',
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it('accepts meta parameter in body', async () => {
    const req = makeReq('http://localhost/api/agents', {
      method: 'POST',
      body: JSON.stringify({
        meta: { name: 'Ops Bot', description: '運用', tags: ['prod', 'ops'] },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it('uses resolved config.yaml template content when creating a new agent', async () => {
    const agentsLib = await import('@/src/lib/agents');

    const req = makeReq('http://localhost/api/agents', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const call = vi.mocked(agentsLib.createAgent).mock.calls[0];
    const files = call[1] as { configYaml: string };
    expect(files.configYaml).not.toContain('mcp_servers');
    expect(files.configYaml).toBe('name: abc1234\n');
  });
});

describe('DELETE /api/agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agents = [];
    mockState.createdAgent = null;
  });

  it('deletes agent by id and returns ok', async () => {
    mockState.agents = [
      {
        agentId: 'abc1234',
        home: '/runtime/agents/abc1234',
        label: 'ai.hermes.gateway.abc1234',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: '',
        description: '',
        tags: [],
        apiServerStatus: 'disabled',
        apiServerAvailable: false,
        apiServerPort: null,
        memoryRssBytes: null,
        hermesVersion: null,
      },
    ];

    const req = makeReq('http://localhost/api/agents?id=abc1234', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('returns 400 if id is missing', async () => {
    const req = makeReq('http://localhost/api/agents', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 if agent not found', async () => {
    mockState.agents = [];
    const req = makeReq('http://localhost/api/agents?id=ghost11', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });

  it('best-effort stops launchd service', async () => {
    mockState.agents = [
      {
        agentId: 'abc1234',
        home: '/runtime/agents/abc1234',
        label: 'ai.hermes.gateway.abc1234',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: '',
        description: '',
        tags: [],
        apiServerStatus: 'disabled',
        apiServerAvailable: false,
        apiServerPort: null,
        memoryRssBytes: null,
        hermesVersion: null,
      },
    ];

    const req = makeReq('http://localhost/api/agents?id=abc1234', { method: 'DELETE' });
    await DELETE(req);
    expect(vi.mocked(execFile)).toHaveBeenCalledWith(
      'launchctl',
      expect.arrayContaining(['unload']),
      expect.any(Function),
    );
  });
});

describe('PUT /api/agents/[id]/meta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agents = [];
    mockState.createdAgent = null;
  });

  it('updates metadata for existing agent', async () => {
    mockState.agents = [
      {
        agentId: 'abc1234',
        home: '/runtime/agents/abc1234',
        label: 'ai.hermes.gateway.abc1234',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: '',
        description: '',
        tags: [],
        apiServerStatus: 'disabled',
        apiServerAvailable: false,
        apiServerPort: null,
        memoryRssBytes: null,
        hermesVersion: null,
      },
    ];

    const req = makeReq('http://localhost/api/agents/abc1234/meta', {
      method: 'PUT',
      body: JSON.stringify({ name: '新名前', description: '説明', tags: ['prod'] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await META_PUT(req, { params: Promise.resolve({ id: 'abc1234' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      name: '新名前',
      description: '説明',
      tags: ['prod'],
      apiServerPort: null,
    });
  });

  it('preserves apiServerPort when updating metadata', async () => {
    mockState.agents = [
      {
        agentId: 'abc1234',
        home: '/runtime/agents/abc1234',
        label: 'ai.hermes.gateway.abc1234',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: 'Old',
        description: 'Old desc',
        tags: ['old'],
        apiServerStatus: 'disabled',
        apiServerAvailable: false,
        apiServerPort: 8647,
        memoryRssBytes: null,
        hermesVersion: null,
      },
    ];

    const req = makeReq('http://localhost/api/agents/abc1234/meta', {
      method: 'PUT',
      body: JSON.stringify({ name: '新名前', description: '説明', tags: ['prod'] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await META_PUT(req, { params: Promise.resolve({ id: 'abc1234' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.apiServerPort).toBe(8647);
  });

  it('returns 404 when agent not found', async () => {
    const req = makeReq('http://localhost/api/agents/ghost/meta', {
      method: 'PUT',
      body: JSON.stringify({ name: 'x' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await META_PUT(req, { params: Promise.resolve({ id: 'ghost' }) });
    expect(res.status).toBe(404);
  });

  it('triggers dependent soul refresh after successful metadata update', async () => {
    mockState.agents = [
      {
        agentId: 'research01',
        home: '/runtime/agents/research01',
        label: 'ai.hermes.gateway.research01',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: '',
        description: '',
        tags: [],
        apiServerStatus: 'disabled',
        apiServerAvailable: false,
        apiServerPort: null,
        memoryRssBytes: null,
        hermesVersion: null,
      },
    ];

    const req = makeReq('http://localhost/api/agents/research01/meta', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated', description: 'New desc', tags: ['v2'] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await META_PUT(req, { params: Promise.resolve({ id: 'research01' }) });
    expect(res.status).toBe(200);
    expect(vi.mocked(refreshDependentSoulsForTarget)).toHaveBeenCalledWith('research01');
  });

  it('does not trigger dependent soul refresh when agent not found', async () => {
    mockState.agents = [];

    const req = makeReq('http://localhost/api/agents/ghost/meta', {
      method: 'PUT',
      body: JSON.stringify({ name: 'x' }),
      headers: { 'Content-Type': 'application/json' },
    });

    await META_PUT(req, { params: Promise.resolve({ id: 'ghost' }) });
    expect(vi.mocked(refreshDependentSoulsForTarget)).not.toHaveBeenCalled();
  });
});

describe('POST /api/agents/copy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agents = [];
    mockState.createdAgent = null;
  });

  it('copies agent with auto-generated id and returns 201', async () => {
    mockState.agents = [
      {
        agentId: 'delta11',
        home: '/runtime/agents/delta11',
        label: 'ai.hermes.gateway.delta11',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: '',
        description: '',
        tags: [],
        apiServerStatus: 'disabled',
        apiServerAvailable: false,
        apiServerPort: null,
        memoryRssBytes: null,
        hermesVersion: null,
      },
    ];

    const req = makeReq('http://localhost/api/agents/copy', {
      method: 'POST',
      body: JSON.stringify({ from: 'delta11' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await COPY_POST(req);
    expect(res.status).toBe(201);
  });

  it('returns 409 when no api server ports are available for copy', async () => {
    const agentsLib = await import('../../src/lib/agents');
    vi.mocked(agentsLib.allocateApiServerPort).mockRejectedValueOnce(new Error('port exhausted'));
    mockState.agents = [
      {
        agentId: 'delta11',
        home: '/runtime/agents/delta11',
        label: 'ai.hermes.gateway.delta11',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: '',
        description: '',
        tags: [],
        apiServerStatus: 'disabled',
        apiServerAvailable: false,
        apiServerPort: null,
        memoryRssBytes: null,
        hermesVersion: null,
      },
    ];

    const req = makeReq('http://localhost/api/agents/copy', {
      method: 'POST',
      body: JSON.stringify({ from: 'delta11' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await COPY_POST(req);
    expect(res.status).toBe(409);
  });

  it('calls fs.cp recursively', async () => {
    mockState.agents = [
      {
        agentId: 'delta11',
        home: '/runtime/agents/delta11',
        label: 'ai.hermes.gateway.delta11',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: '',
        description: '',
        tags: [],
        apiServerStatus: 'disabled',
        apiServerAvailable: false,
        apiServerPort: null,
        memoryRssBytes: null,
        hermesVersion: null,
      },
    ];

    const req = makeReq('http://localhost/api/agents/copy', {
      method: 'POST',
      body: JSON.stringify({ from: 'delta11' }),
      headers: { 'Content-Type': 'application/json' },
    });

    await COPY_POST(req);
    expect(vi.mocked(fs.cp)).toHaveBeenCalledWith('/runtime/agents/delta11', expect.any(String), {
      recursive: true,
      filter: expect.any(Function),
    });
  });

  it('sanitizes copied env platform token values', async () => {
    mockState.agents = [
      {
        agentId: 'delta11',
        home: '/runtime/agents/delta11',
        label: 'ai.hermes.gateway.delta11',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: '',
        description: '',
        tags: [],
        apiServerStatus: 'disabled',
        apiServerAvailable: false,
        apiServerPort: null,
        memoryRssBytes: null,
        hermesVersion: null,
      },
    ];

    const req = makeReq('http://localhost/api/agents/copy', {
      method: 'POST',
      body: JSON.stringify({ from: 'delta11' }),
      headers: { 'Content-Type': 'application/json' },
    });

    await COPY_POST(req);

    expect(vi.mocked(clearTokenValues)).toHaveBeenCalledWith(
      expect.stringContaining('/runtime/agents/abc1234/.env'),
      PLATFORM_TOKEN_KEYS,
    );
  });

  it('appends (Copy) to copied agent name when meta exists', async () => {
    mockState.agents = [
      {
        agentId: 'delta11',
        home: '/runtime/agents/delta11',
        label: 'ai.hermes.gateway.delta11',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: 'My Bot',
        description: '',
        tags: ['prod'],
        apiServerStatus: 'disabled',
        apiServerAvailable: false,
        apiServerPort: null,
        memoryRssBytes: null,
        hermesVersion: null,
      },
    ];

    vi.mocked(fs.readFile).mockResolvedValue(
      JSON.stringify({ name: 'My Bot', description: '', tags: ['prod'] }) as never,
    );

    const req = makeReq('http://localhost/api/agents/copy', {
      method: 'POST',
      body: JSON.stringify({ from: 'delta11' }),
      headers: { 'Content-Type': 'application/json' },
    });

    await COPY_POST(req);

    expect(vi.mocked(fs.writeFile)).toHaveBeenCalledWith(
      expect.stringContaining('/runtime/agents/abc1234/meta.json'),
      expect.stringContaining('My Bot (Copy)'),
      'utf-8',
    );
    const metaWrite = vi
      .mocked(fs.writeFile)
      .mock.calls.find((call) => String(call[0]).includes('/runtime/agents/abc1234/meta.json'));
    expect(metaWrite?.[1]).toContain('"apiServerPort": 8642');
  });

  it('creates meta.json with apiServerPort when copied agent had no meta', async () => {
    mockState.agents = [
      {
        agentId: 'delta11',
        home: '/runtime/agents/delta11',
        label: 'ai.hermes.gateway.delta11',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: '',
        description: '',
        tags: [],
        apiServerStatus: 'disabled',
        apiServerAvailable: false,
        apiServerPort: null,
        memoryRssBytes: null,
        hermesVersion: null,
      },
    ];

    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT') as never);

    const req = makeReq('http://localhost/api/agents/copy', {
      method: 'POST',
      body: JSON.stringify({ from: 'delta11' }),
      headers: { 'Content-Type': 'application/json' },
    });

    await COPY_POST(req);

    const metaWrite = vi
      .mocked(fs.writeFile)
      .mock.calls.find((call) => String(call[0]).includes('/runtime/agents/abc1234/meta.json'));
    expect(metaWrite?.[1]).toContain('"apiServerPort": 8642');
  });

  it('returns 404 if source agent not found', async () => {
    mockState.agents = [];

    const req = makeReq('http://localhost/api/agents/copy', {
      method: 'POST',
      body: JSON.stringify({ from: 'missing' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await COPY_POST(req);
    expect(res.status).toBe(404);
  });
});
