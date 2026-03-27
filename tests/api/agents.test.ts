// @vitest-environment node
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- hoisted mock state ---
const mockState = vi.hoisted(() => ({
  agentRows: [] as Record<string, unknown>[],
  insertRows: [] as Record<string, unknown>[],
}));

// --- mock @/src/lib/db ---
vi.mock('@/src/lib/db', async () => {
  // Import real schema so drizzle column objects work with eq()
  const { agents, envVars, skillLinks } = await import('../../db/schema');

  function makeChain(resolveWith: unknown) {
    const thenable = {
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
        Promise.resolve(resolveWith).then(res, rej),
      catch: (cb: (e: unknown) => unknown) => Promise.resolve(resolveWith).catch(cb),
      finally: (cb: () => void) => Promise.resolve(resolveWith).finally(cb),
    };
    const chain: Record<string, unknown> = {
      ...thenable,
      from: () => ({ ...thenable, where: () => thenable }),
      where: () => thenable,
      values: () => ({ returning: () => thenable }),
    };
    return chain;
  }

  const db = {
    select: () => makeChain(mockState.agentRows),
    insert: () => makeChain(mockState.insertRows),
    delete: () => makeChain(undefined),
  };

  return { db, schema: { agents, envVars, skillLinks } };
});

// --- mock node:fs/promises ---
vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
    cp: vi.fn().mockResolvedValue(undefined),
  },
}));

// --- mock node:child_process ---
vi.mock('node:child_process', () => ({
  execFile: vi.fn((_cmd: string, _args: string[], cb: (err: null) => void) => cb(null)),
}));

// Import handlers after mocks are set up
import { POST as COPY_POST } from '../../app/api/agents/copy/route';
import { DELETE, GET, POST } from '../../app/api/agents/route';

function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

describe('GET /api/agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agentRows = [];
    mockState.insertRows = [];
  });

  it('returns empty array when no agents', async () => {
    mockState.agentRows = [];
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns agents list', async () => {
    mockState.agentRows = [
      {
        id: 1,
        name: 'alpha',
        home: '/runtime/agents/alpha',
        label: 'ai.hermes.gateway.alpha',
        enabled: false,
        createdAt: new Date(),
      },
    ];
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('alpha');
  });
});

describe('POST /api/agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agentRows = [];
    mockState.insertRows = [];
  });

  it('creates agent with valid name and returns 201', async () => {
    const created = {
      id: 1,
      name: 'alpha_1',
      home: '/runtime/agents/alpha_1',
      label: 'ai.hermes.gateway.alpha_1',
      enabled: false,
      createdAt: new Date(),
    };
    mockState.insertRows = [created];

    const req = makeReq('http://localhost/api/agents', {
      method: 'POST',
      body: JSON.stringify({ name: 'alpha_1' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('alpha_1');
    expect(body.label).toBe('ai.hermes.gateway.alpha_1');
  });

  it('returns 400 for name with spaces', async () => {
    const req = makeReq('http://localhost/api/agents', {
      method: 'POST',
      body: JSON.stringify({ name: 'bad name!' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('returns 400 for empty name', async () => {
    const req = makeReq('http://localhost/api/agents', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('scaffolds filesystem on create', async () => {
    mockState.insertRows = [
      {
        id: 2,
        name: 'beta',
        home: '/runtime/agents/beta',
        label: 'ai.hermes.gateway.beta',
        enabled: false,
        createdAt: new Date(),
      },
    ];

    const req = makeReq('http://localhost/api/agents', {
      method: 'POST',
      body: JSON.stringify({ name: 'beta' }),
      headers: { 'Content-Type': 'application/json' },
    });

    await POST(req);
    expect(vi.mocked(fs.mkdir)).toHaveBeenCalled();
    expect(vi.mocked(fs.writeFile)).toHaveBeenCalled();
  });
});

describe('DELETE /api/agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agentRows = [];
  });

  it('deletes agent and returns ok', async () => {
    mockState.agentRows = [
      {
        id: 1,
        name: 'bravo',
        home: '/runtime/agents/bravo',
        label: 'ai.hermes.gateway.bravo',
        enabled: false,
        createdAt: new Date(),
      },
    ];

    const req = makeReq('http://localhost/api/agents?name=bravo', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('does not call fs.rm without purge=true', async () => {
    mockState.agentRows = [
      {
        id: 1,
        name: 'bravo',
        home: '/runtime/agents/bravo',
        label: 'ai.hermes.gateway.bravo',
        enabled: false,
        createdAt: new Date(),
      },
    ];

    const req = makeReq('http://localhost/api/agents?name=bravo', { method: 'DELETE' });
    await DELETE(req);
    expect(vi.mocked(fs.rm)).not.toHaveBeenCalled();
  });

  it('calls fs.rm with purge=true', async () => {
    mockState.agentRows = [
      {
        id: 1,
        name: 'charlie',
        home: '/runtime/agents/charlie',
        label: 'ai.hermes.gateway.charlie',
        enabled: false,
        createdAt: new Date(),
      },
    ];

    const req = makeReq('http://localhost/api/agents?name=charlie&purge=true', {
      method: 'DELETE',
    });
    await DELETE(req);
    expect(vi.mocked(fs.rm)).toHaveBeenCalledWith('/runtime/agents/charlie', {
      recursive: true,
      force: true,
    });
  });

  it('returns 400 if name is missing', async () => {
    const req = makeReq('http://localhost/api/agents', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 if agent not found', async () => {
    mockState.agentRows = [];
    const req = makeReq('http://localhost/api/agents?name=ghost', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });

  it('best-effort stops launchd service', async () => {
    mockState.agentRows = [
      {
        id: 1,
        name: 'bravo',
        home: '/runtime/agents/bravo',
        label: 'ai.hermes.gateway.bravo',
        enabled: false,
        createdAt: new Date(),
      },
    ];

    const req = makeReq('http://localhost/api/agents?name=bravo', { method: 'DELETE' });
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
    mockState.agentRows = [];
    mockState.insertRows = [];
  });

  it('copies agent and returns 201', async () => {
    mockState.agentRows = [
      {
        id: 1,
        name: 'delta',
        home: '/runtime/agents/delta',
        label: 'ai.hermes.gateway.delta',
        enabled: false,
        createdAt: new Date(),
      },
    ];
    mockState.insertRows = [
      {
        id: 2,
        name: 'echo',
        home: '/runtime/agents/echo',
        label: 'ai.hermes.gateway.echo',
        enabled: false,
        createdAt: new Date(),
      },
    ];

    const req = makeReq('http://localhost/api/agents/copy', {
      method: 'POST',
      body: JSON.stringify({ from: 'delta', to: 'echo' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await COPY_POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('echo');
    expect(body.label).toBe('ai.hermes.gateway.echo');
  });

  it('calls fs.cp recursively', async () => {
    mockState.agentRows = [
      {
        id: 1,
        name: 'delta',
        home: '/runtime/agents/delta',
        label: 'ai.hermes.gateway.delta',
        enabled: false,
        createdAt: new Date(),
      },
    ];
    mockState.insertRows = [
      {
        id: 2,
        name: 'foxtrot',
        home: '/runtime/agents/foxtrot',
        label: 'ai.hermes.gateway.foxtrot',
        enabled: false,
        createdAt: new Date(),
      },
    ];

    const req = makeReq('http://localhost/api/agents/copy', {
      method: 'POST',
      body: JSON.stringify({ from: 'delta', to: 'foxtrot' }),
      headers: { 'Content-Type': 'application/json' },
    });

    await COPY_POST(req);
    expect(vi.mocked(fs.cp)).toHaveBeenCalledWith(
      '/runtime/agents/delta',
      expect.stringContaining('foxtrot'),
      { recursive: true },
    );
  });

  it('returns 404 if source agent not found', async () => {
    mockState.agentRows = [];

    const req = makeReq('http://localhost/api/agents/copy', {
      method: 'POST',
      body: JSON.stringify({ from: 'missing', to: 'new' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await COPY_POST(req);
    expect(res.status).toBe(404);
  });
});
