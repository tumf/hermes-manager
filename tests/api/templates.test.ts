// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- hoisted mock state ---
const mockState = vi.hoisted(() => ({
  templateRows: [] as Record<string, unknown>[],
  insertRows: [] as Record<string, unknown>[],
  updateRows: [] as Record<string, unknown>[],
  deleteResult: undefined as unknown,
}));

// --- mock @/src/lib/db ---
vi.mock('@/src/lib/db', async () => {
  const { agents, envVars, skillLinks, templates } = await import('../../db/schema');

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
      set: () => ({ where: () => ({ returning: () => thenable }) }),
      returning: () => thenable,
    };
    return chain;
  }

  const db = {
    select: () => makeChain(mockState.templateRows),
    insert: () => makeChain(mockState.insertRows),
    update: () => makeChain(mockState.updateRows),
    delete: () => makeChain(mockState.deleteResult),
  };

  return { db, schema: { agents, envVars, skillLinks, templates } };
});

import { DELETE, GET, POST, PUT } from '../../app/api/templates/route';

function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

describe('GET /api/templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.templateRows = [];
  });

  it('returns empty array when no templates', async () => {
    const req = makeReq('http://localhost/api/templates');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns all templates', async () => {
    mockState.templateRows = [
      { id: 1, fileType: 'agents.md', name: 'default', content: '# Default\n' },
      { id: 2, fileType: 'config.yaml', name: 'telegram-bot', content: 'name: bot\n' },
    ];
    const req = makeReq('http://localhost/api/templates');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it('filters by fileType', async () => {
    mockState.templateRows = [
      { id: 1, fileType: 'agents.md', name: 'default', content: '# Default\n' },
    ];
    const req = makeReq('http://localhost/api/templates?fileType=agents.md');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].fileType).toBe('agents.md');
  });

  it('returns 400 for invalid fileType', async () => {
    const req = makeReq('http://localhost/api/templates?fileType=invalid');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.templateRows = [];
    mockState.insertRows = [];
  });

  it('creates template and returns 201', async () => {
    mockState.templateRows = []; // no existing
    mockState.insertRows = [
      { id: 1, fileType: 'config.yaml', name: 'telegram-bot', content: 'name: bot\n' },
    ];

    const req = makeReq('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        fileType: 'config.yaml',
        name: 'telegram-bot',
        content: 'name: bot\n',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('telegram-bot');
    expect(body.fileType).toBe('config.yaml');
  });

  it('returns 409 when duplicate exists', async () => {
    mockState.templateRows = [
      { id: 1, fileType: 'agents.md', name: 'default', content: '# Default\n' },
    ];

    const req = makeReq('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        fileType: 'agents.md',
        name: 'default',
        content: '# New content',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it('returns 400 for invalid fileType', async () => {
    const req = makeReq('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        fileType: 'invalid.txt',
        name: 'test',
        content: 'test',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid name', async () => {
    const req = makeReq('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        fileType: 'agents.md',
        name: 'bad name!',
        content: 'test',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = makeReq('http://localhost/api/templates', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'text/plain' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.templateRows = [];
    mockState.updateRows = [];
  });

  it('updates existing template', async () => {
    mockState.templateRows = [
      { id: 1, fileType: 'agents.md', name: 'default', content: '# Old\n' },
    ];
    mockState.updateRows = [
      { id: 1, fileType: 'agents.md', name: 'default', content: '# Updated\n' },
    ];

    const req = makeReq('http://localhost/api/templates', {
      method: 'PUT',
      body: JSON.stringify({
        fileType: 'agents.md',
        name: 'default',
        content: '# Updated\n',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe('# Updated\n');
  });

  it('returns 404 when template not found', async () => {
    mockState.templateRows = [];

    const req = makeReq('http://localhost/api/templates', {
      method: 'PUT',
      body: JSON.stringify({
        fileType: 'agents.md',
        name: 'nonexistent',
        content: 'test',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.templateRows = [];
  });

  it('deletes template and returns ok', async () => {
    mockState.templateRows = [
      { id: 1, fileType: 'soul.md', name: 'old-template', content: 'test' },
    ];

    const req = makeReq('http://localhost/api/templates?fileType=soul.md&name=old-template', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('returns 400 when missing params', async () => {
    const req = makeReq('http://localhost/api/templates', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid fileType', async () => {
    const req = makeReq('http://localhost/api/templates?fileType=bad&name=test', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when template not found', async () => {
    mockState.templateRows = [];

    const req = makeReq('http://localhost/api/templates?fileType=agents.md&name=ghost', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });
});
