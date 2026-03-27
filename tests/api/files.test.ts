// @vitest-environment node
import fs from 'node:fs/promises';

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- hoisted mock state ---
const mockState = vi.hoisted(() => ({
  agentRows: [] as Record<string, unknown>[],
}));

// --- mock @/src/lib/db ---
vi.mock('@/src/lib/db', async () => {
  const { agents } = await import('../../db/schema');

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

  return { db, schema: { agents } };
});

// --- mock node:fs/promises ---
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
  },
}));

import { GET, PUT } from '../../app/api/files/route';

function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

const AGENT = {
  id: 1,
  name: 'alpha',
  home: '/agents/alpha',
  label: 'ai.hermes.gateway.alpha',
  enabled: false,
  createdAt: new Date(),
};

describe('GET /api/files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agentRows = [];
  });

  it('returns file content for allowed path', async () => {
    mockState.agentRows = [AGENT];
    vi.mocked(fs.readFile).mockResolvedValue('# Soul\n' as never);

    const req = makeReq('http://localhost/api/files?agent=alpha&path=SOUL.md');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe('# Soul\n');
  });

  it('returns 400 for disallowed path', async () => {
    mockState.agentRows = [AGENT];
    const req = makeReq('http://localhost/api/files?agent=alpha&path=../../etc/passwd');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when agent not found', async () => {
    mockState.agentRows = [];
    const req = makeReq('http://localhost/api/files?agent=ghost&path=SOUL.md');
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('returns 400 when agent param missing', async () => {
    const req = makeReq('http://localhost/api/files?path=SOUL.md');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agentRows = [];
  });

  it('writes file atomically and returns ok', async () => {
    mockState.agentRows = [AGENT];

    const req = makeReq('http://localhost/api/files', {
      method: 'PUT',
      body: JSON.stringify({ agent: 'alpha', path: 'SOUL.md', content: '# Soul\n' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(vi.mocked(fs.writeFile)).toHaveBeenCalledWith(
      '/agents/alpha/SOUL.md.tmp',
      '# Soul\n',
      'utf-8',
    );
    expect(vi.mocked(fs.rename)).toHaveBeenCalledWith(
      '/agents/alpha/SOUL.md.tmp',
      '/agents/alpha/SOUL.md',
    );
  });

  it('returns 422 for invalid YAML in config.yaml', async () => {
    mockState.agentRows = [AGENT];

    const req = makeReq('http://localhost/api/files', {
      method: 'PUT',
      body: JSON.stringify({ agent: 'alpha', path: 'config.yaml', content: '[not: yaml' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/YAML/i);
  });

  it('accepts valid YAML for config.yaml', async () => {
    mockState.agentRows = [AGENT];

    const req = makeReq('http://localhost/api/files', {
      method: 'PUT',
      body: JSON.stringify({ agent: 'alpha', path: 'config.yaml', content: 'name: alpha\n' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
  });

  it('returns 404 when agent not found', async () => {
    mockState.agentRows = [];

    const req = makeReq('http://localhost/api/files', {
      method: 'PUT',
      body: JSON.stringify({ agent: 'ghost', path: 'SOUL.md', content: 'hello' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(404);
  });

  it('returns 400 for disallowed path', async () => {
    mockState.agentRows = [AGENT];

    const req = makeReq('http://localhost/api/files', {
      method: 'PUT',
      body: JSON.stringify({ agent: 'alpha', path: '../../etc/passwd', content: 'evil' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(400);
  });
});
