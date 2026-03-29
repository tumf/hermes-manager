// @vitest-environment node
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- hoisted mock state ---
const mockState = vi.hoisted(() => ({
  agentRows: [] as Record<string, unknown>[],
  insertRows: [] as Record<string, unknown>[],
  // Track select call count to return empty array for ID uniqueness checks
  selectCallCount: 0,
  // When > 0, after the first N select calls return agentRows, subsequent calls return []
  selectEmptyAfter: 0,
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
    select: (...args: unknown[]) => {
      mockState.selectCallCount++;
      // If selectEmptyAfter is set, return empty after that many calls
      if (
        mockState.selectEmptyAfter > 0 &&
        mockState.selectCallCount > mockState.selectEmptyAfter
      ) {
        return makeChain([]);
      }
      void args;
      return makeChain(mockState.agentRows);
    },
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

// --- mock src/lib/templates ---
// resolveTemplateContent uses synchronous node:fs (not node:fs/promises),
// so we must mock the templates module to prevent real filesystem reads.
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

function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

describe('GET /api/agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agentRows = [];
    mockState.insertRows = [];
    mockState.selectCallCount = 0;
    mockState.selectEmptyAfter = 0;
  });

  it('returns empty array when no agents', async () => {
    mockState.agentRows = [];
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns agents list with agentId', async () => {
    mockState.agentRows = [
      {
        id: 1,
        agentId: 'abc1234',
        home: '/runtime/agents/abc1234',
        label: 'ai.hermes.gateway.abc1234',
        enabled: false,
        createdAt: new Date(),
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
    mockState.agentRows = [];
    mockState.insertRows = [];
    mockState.selectCallCount = 0;
    mockState.selectEmptyAfter = 0;
  });

  it('creates agent without body and returns 201 with auto-generated id', async () => {
    const created = {
      id: 1,
      agentId: 'abc1234',
      home: '/runtime/agents/abc1234',
      label: 'ai.hermes.gateway.abc1234',
      enabled: false,
      createdAt: new Date(),
    };
    mockState.insertRows = [created];

    const res = await POST(new NextRequest('http://localhost/api/agents', { method: 'POST' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.agentId).toBe('abc1234');
    expect(body.label).toBe('ai.hermes.gateway.abc1234');
  });

  it('scaffolds filesystem on create', async () => {
    mockState.insertRows = [
      {
        id: 2,
        agentId: 'abc1234',
        home: '/runtime/agents/abc1234',
        label: 'ai.hermes.gateway.abc1234',
        enabled: false,
        createdAt: new Date(),
      },
    ];

    await POST(new NextRequest('http://localhost/api/agents', { method: 'POST' }));
    expect(vi.mocked(fs.mkdir)).toHaveBeenCalled();
    expect(vi.mocked(fs.writeFile)).toHaveBeenCalled();
  });

  it('scaffolds with fallback content when no templates exist', async () => {
    mockState.agentRows = []; // No template rows returned from DB
    mockState.insertRows = [
      {
        id: 3,
        agentId: 'abc1234',
        home: '/runtime/agents/abc1234',
        label: 'ai.hermes.gateway.abc1234',
        enabled: false,
        createdAt: new Date(),
      },
    ];

    await POST(new NextRequest('http://localhost/api/agents', { method: 'POST' }));
    // Verify fallback content is used
    const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
    const agentsMdCall = writeFileCalls.find(
      (c) => typeof c[0] === 'string' && c[0].endsWith('AGENTS.md'),
    );
    expect(agentsMdCall).toBeDefined();
    expect(agentsMdCall![1]).toBe('# abc1234\n');
  });

  it('accepts templates parameter in body', async () => {
    mockState.agentRows = []; // Template lookups return empty
    mockState.insertRows = [
      {
        id: 4,
        agentId: 'abc1234',
        home: '/runtime/agents/abc1234',
        label: 'ai.hermes.gateway.abc1234',
        enabled: false,
        createdAt: new Date(),
      },
    ];

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
    mockState.agentRows = [];
    mockState.selectCallCount = 0;
    mockState.selectEmptyAfter = 0;
  });

  it('deletes agent by id and returns ok', async () => {
    mockState.agentRows = [
      {
        id: 1,
        agentId: 'abc1234',
        home: '/runtime/agents/abc1234',
        label: 'ai.hermes.gateway.abc1234',
        enabled: false,
        createdAt: new Date(),
      },
    ];

    const req = makeReq('http://localhost/api/agents?id=abc1234', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('does not call fs.rm without purge=true', async () => {
    mockState.agentRows = [
      {
        id: 1,
        agentId: 'abc1234',
        home: '/runtime/agents/abc1234',
        label: 'ai.hermes.gateway.abc1234',
        enabled: false,
        createdAt: new Date(),
      },
    ];

    const req = makeReq('http://localhost/api/agents?id=abc1234', { method: 'DELETE' });
    await DELETE(req);
    expect(vi.mocked(fs.rm)).not.toHaveBeenCalled();
  });

  it('calls fs.rm with purge=true', async () => {
    mockState.agentRows = [
      {
        id: 1,
        agentId: 'def5678',
        home: '/runtime/agents/def5678',
        label: 'ai.hermes.gateway.def5678',
        enabled: false,
        createdAt: new Date(),
      },
    ];

    const req = makeReq('http://localhost/api/agents?id=def5678&purge=true', {
      method: 'DELETE',
    });
    await DELETE(req);
    expect(vi.mocked(fs.rm)).toHaveBeenCalledWith('/runtime/agents/def5678', {
      recursive: true,
      force: true,
    });
  });

  it('returns 400 if id is missing', async () => {
    const req = makeReq('http://localhost/api/agents', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 if agent not found', async () => {
    mockState.agentRows = [];
    const req = makeReq('http://localhost/api/agents?id=ghost11', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });

  it('best-effort stops launchd service', async () => {
    mockState.agentRows = [
      {
        id: 1,
        agentId: 'abc1234',
        home: '/runtime/agents/abc1234',
        label: 'ai.hermes.gateway.abc1234',
        enabled: false,
        createdAt: new Date(),
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
    mockState.agentRows = [];
    mockState.insertRows = [];
    mockState.selectCallCount = 0;
    mockState.selectEmptyAfter = 0;
  });

  it('copies agent with auto-generated id and returns 201', async () => {
    // First select finds the source agent, subsequent selects return empty (no collision)
    mockState.selectEmptyAfter = 1;
    mockState.agentRows = [
      {
        id: 1,
        agentId: 'delta11',
        home: '/runtime/agents/delta11',
        label: 'ai.hermes.gateway.delta11',
        enabled: false,
        createdAt: new Date(),
      },
    ];
    mockState.insertRows = [
      {
        id: 2,
        agentId: 'abc1234',
        home: '/runtime/agents/abc1234',
        label: 'ai.hermes.gateway.abc1234',
        enabled: false,
        createdAt: new Date(),
      },
    ];

    const req = makeReq('http://localhost/api/agents/copy', {
      method: 'POST',
      body: JSON.stringify({ from: 'delta11' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await COPY_POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.agentId).toBe('abc1234');
  });

  it('calls fs.cp recursively', async () => {
    mockState.selectEmptyAfter = 1;
    mockState.agentRows = [
      {
        id: 1,
        agentId: 'delta11',
        home: '/runtime/agents/delta11',
        label: 'ai.hermes.gateway.delta11',
        enabled: false,
        createdAt: new Date(),
      },
    ];
    mockState.insertRows = [
      {
        id: 2,
        agentId: 'abc1234',
        home: '/runtime/agents/abc1234',
        label: 'ai.hermes.gateway.abc1234',
        enabled: false,
        createdAt: new Date(),
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
    mockState.agentRows = [];

    const req = makeReq('http://localhost/api/agents/copy', {
      method: 'POST',
      body: JSON.stringify({ from: 'missing' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await COPY_POST(req);
    expect(res.status).toBe(404);
  });
});
