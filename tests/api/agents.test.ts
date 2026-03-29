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
  createAgent: vi.fn(async (agentId: string) => {
    const agent: Agent = {
      agentId,
      home: `/runtime/agents/${agentId}`,
      label: `ai.hermes.gateway.${agentId}`,
      enabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockState.createdAgent = agent;
    return agent;
  }),
  deleteAgent: vi.fn(async () => undefined),
}));

// --- mock node:fs/promises ---
vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
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
      'AGENTS.md': (id: string) => `# ${id}\n`,
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

// Import handlers after mocks are set up
import { POST as COPY_POST } from '../../app/api/agents/copy/route';
import { DELETE, GET, POST } from '../../app/api/agents/route';
import type { Agent } from '../../src/lib/agents';

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
      },
    ];
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].agentId).toBe('abc1234');
  });
});

describe('POST /api/agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agents = [];
    mockState.createdAgent = null;
  });

  it('creates agent without body and returns 201 with auto-generated id', async () => {
    const res = await POST(new NextRequest('http://localhost/api/agents', { method: 'POST' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.agentId).toBe('abc1234');
    expect(body.label).toBe('ai.hermes.gateway.abc1234');
  });

  it('accepts templates parameter in body', async () => {
    const req = makeReq('http://localhost/api/agents', {
      method: 'POST',
      body: JSON.stringify({
        templates: { agentsMd: 'telegram-bot', soulMd: 'default', configYaml: 'custom' },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
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

  it('calls fs.cp recursively', async () => {
    mockState.agents = [
      {
        agentId: 'delta11',
        home: '/runtime/agents/delta11',
        label: 'ai.hermes.gateway.delta11',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
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
    });
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
