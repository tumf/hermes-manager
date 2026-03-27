// @vitest-environment node
import fs from 'node:fs/promises';

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- hoisted mock state ---
const mockState = vi.hoisted(() => ({
  agentRows: [] as Record<string, unknown>[],
  fsContent: '' as string,
}));

// --- mock @/src/lib/db ---
vi.mock('@/src/lib/db', async () => {
  const { agents, envVars, skillLinks } = await import('../../db/schema');

  function makeChain(resolveWith: unknown) {
    const thenable = {
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
        Promise.resolve(resolveWith).then(res, rej),
      catch: (cb: (e: unknown) => unknown) => Promise.resolve(resolveWith).catch(cb),
      finally: (cb: () => void) => Promise.resolve(resolveWith).finally(cb),
    };
    return {
      ...thenable,
      from: () => ({ ...thenable, where: () => thenable }),
      where: () => thenable,
    };
  }

  const db = {
    select: () => makeChain(mockState.agentRows),
  };

  return { db, schema: { agents, envVars, skillLinks } };
});

// --- mock node:fs/promises ---
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(async () => mockState.fsContent),
    writeFile: vi.fn(async (_path: string, content: string) => {
      mockState.fsContent = content;
    }),
  },
}));

import { GET as RESOLVED_GET } from '../../app/api/env/resolved/route';
import { DELETE, GET, POST } from '../../app/api/env/route';

function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

const ALPHA = {
  id: 1,
  name: 'alpha',
  home: '/runtime/agents/alpha',
  label: 'ai.hermes.gateway.alpha',
  enabled: false,
  createdAt: new Date(),
};

describe('GET /api/env', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agentRows = [];
    mockState.fsContent = '';
  });

  it('returns 400 if agent param missing', async () => {
    const res = await GET(makeReq('http://localhost/api/env'));
    expect(res.status).toBe(400);
  });

  it('returns 404 if agent not found', async () => {
    mockState.agentRows = [];
    const res = await GET(makeReq('http://localhost/api/env?agent=ghost'));
    expect(res.status).toBe(404);
  });

  it('returns masked values by default', async () => {
    mockState.agentRows = [ALPHA];
    mockState.fsContent = 'API_KEY=secret\n';
    const res = await GET(makeReq('http://localhost/api/env?agent=alpha'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([{ key: 'API_KEY', value: '***', masked: true }]);
  });

  it('returns real values with reveal=true', async () => {
    mockState.agentRows = [ALPHA];
    mockState.fsContent = 'API_KEY=secret\n';
    const res = await GET(makeReq('http://localhost/api/env?agent=alpha&reveal=true'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([{ key: 'API_KEY', value: 'secret', masked: false }]);
  });

  it('returns empty array for empty .env', async () => {
    mockState.agentRows = [ALPHA];
    mockState.fsContent = '';
    const res = await GET(makeReq('http://localhost/api/env?agent=alpha'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe('POST /api/env', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agentRows = [];
    mockState.fsContent = '';
  });

  it('returns 400 for invalid JSON', async () => {
    const req = makeReq('http://localhost/api/env', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing fields', async () => {
    const req = makeReq('http://localhost/api/env', {
      method: 'POST',
      body: JSON.stringify({ agent: 'alpha' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown agent', async () => {
    mockState.agentRows = [];
    const req = makeReq('http://localhost/api/env', {
      method: 'POST',
      body: JSON.stringify({ agent: 'ghost', key: 'FOO', value: 'bar' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('upserts a new key and writes file', async () => {
    mockState.agentRows = [ALPHA];
    mockState.fsContent = 'EXISTING=val\n';
    const req = makeReq('http://localhost/api/env', {
      method: 'POST',
      body: JSON.stringify({ agent: 'alpha', key: 'NEW_VAR', value: 'hello' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(vi.mocked(fs.writeFile)).toHaveBeenCalled();
    expect(mockState.fsContent).toContain('NEW_VAR=hello');
    expect(mockState.fsContent).toContain('EXISTING=val');
  });

  it('updates an existing key', async () => {
    mockState.agentRows = [ALPHA];
    mockState.fsContent = 'API_KEY=old\n';
    const req = makeReq('http://localhost/api/env', {
      method: 'POST',
      body: JSON.stringify({ agent: 'alpha', key: 'API_KEY', value: 'new' }),
      headers: { 'Content-Type': 'application/json' },
    });
    await POST(req);
    expect(mockState.fsContent).toContain('API_KEY=new');
    expect(mockState.fsContent).not.toContain('API_KEY=old');
  });
});

describe('DELETE /api/env', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agentRows = [];
    mockState.fsContent = '';
  });

  it('returns 400 if agent param missing', async () => {
    const res = await DELETE(makeReq('http://localhost/api/env?key=FOO', { method: 'DELETE' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 if key param missing', async () => {
    const res = await DELETE(makeReq('http://localhost/api/env?agent=alpha', { method: 'DELETE' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown agent', async () => {
    mockState.agentRows = [];
    const res = await DELETE(
      makeReq('http://localhost/api/env?agent=ghost&key=FOO', { method: 'DELETE' }),
    );
    expect(res.status).toBe(404);
  });

  it('removes a key from .env file', async () => {
    mockState.agentRows = [ALPHA];
    mockState.fsContent = 'REMOVE_ME=yes\nKEEP=ok\n';
    const res = await DELETE(
      makeReq('http://localhost/api/env?agent=alpha&key=REMOVE_ME', { method: 'DELETE' }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockState.fsContent).not.toContain('REMOVE_ME');
    expect(mockState.fsContent).toContain('KEEP=ok');
  });
});

describe('GET /api/env/resolved', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agentRows = [];
    mockState.fsContent = '';
  });

  it('returns 400 if agent param missing', async () => {
    const res = await RESOLVED_GET(makeReq('http://localhost/api/env/resolved'));
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown agent', async () => {
    mockState.agentRows = [];
    const res = await RESOLVED_GET(makeReq('http://localhost/api/env/resolved?agent=ghost'));
    expect(res.status).toBe(404);
  });

  it('returns merged view with source annotations', async () => {
    mockState.agentRows = [ALPHA];
    // readFile is called twice: global .env and agent .env
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce('BASE_URL=https://example.com\n' as never)
      .mockResolvedValueOnce('API_KEY=secret\nBASE_URL=https://override.example.com\n' as never);

    const res = await RESOLVED_GET(makeReq('http://localhost/api/env/resolved?agent=alpha'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ key: string; value: string; source: string }>;

    const baseUrl = body.find((e) => e.key === 'BASE_URL');
    expect(baseUrl).toEqual({
      key: 'BASE_URL',
      value: 'https://override.example.com',
      source: 'agent-override',
    });

    const apiKey = body.find((e) => e.key === 'API_KEY');
    expect(apiKey).toEqual({ key: 'API_KEY', value: 'secret', source: 'agent' });
  });

  it('marks global-only keys with source=global', async () => {
    mockState.agentRows = [ALPHA];
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce('GLOBAL_VAR=gval\n' as never)
      .mockResolvedValueOnce('' as never);

    const res = await RESOLVED_GET(makeReq('http://localhost/api/env/resolved?agent=alpha'));
    const body = (await res.json()) as Array<{ key: string; value: string; source: string }>;
    expect(body).toEqual([{ key: 'GLOBAL_VAR', value: 'gval', source: 'global' }]);
  });
});
