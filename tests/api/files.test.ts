// @vitest-environment node
import fs from 'node:fs/promises';

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, PUT } from '../../app/api/files/route';
import type { Agent } from '../../src/lib/agents';

// --- hoisted mock state ---
const mockState = vi.hoisted(() => ({
  agent: null as Agent | null,
}));

// --- mock @/src/lib/agents ---
vi.mock('@/src/lib/agents', () => ({
  getAgent: vi.fn(async () => mockState.agent),
}));

// --- mock node:fs/promises ---
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
  },
}));

function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

const AGENT: Agent = {
  agentId: 'alpha',
  home: '/runtime/agents/alpha',
  label: 'ai.hermes.gateway.alpha',
  enabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  name: '',
  description: '',
  tags: [],
  apiServerStatus: 'disabled',
  apiServerAvailable: false,
  apiServerPort: null,
};

describe('GET /api/files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agent = null;
  });

  it('returns file content for allowed path', async () => {
    mockState.agent = AGENT;
    vi.mocked(fs.readFile).mockResolvedValue('# Soul\n' as never);

    const req = makeReq('http://localhost/api/files?agent=alpha&path=SOUL.md');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe('# Soul\n');
  });

  it('returns 400 for disallowed path', async () => {
    mockState.agent = AGENT;
    const req = makeReq('http://localhost/api/files?agent=alpha&path=../../etc/passwd');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns file content for MEMORY.md path', async () => {
    mockState.agent = AGENT;
    vi.mocked(fs.readFile).mockResolvedValue('# Memory\n' as never);

    const req = makeReq('http://localhost/api/files?agent=alpha&path=memories/MEMORY.md');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe('# Memory\n');
  });

  it('rejects AGENTS.md path', async () => {
    mockState.agent = AGENT;
    const req = makeReq('http://localhost/api/files?agent=alpha&path=AGENTS.md');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when agent not found', async () => {
    mockState.agent = null;
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
    mockState.agent = null;
  });

  it('writes file atomically and returns ok', async () => {
    mockState.agent = AGENT;

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
      '/runtime/agents/alpha/SOUL.md.tmp',
      '# Soul\n',
      'utf-8',
    );
    expect(vi.mocked(fs.rename)).toHaveBeenCalledWith(
      '/runtime/agents/alpha/SOUL.md.tmp',
      '/runtime/agents/alpha/SOUL.md',
    );
  });

  it('writes MEMORY.md atomically and returns ok', async () => {
    mockState.agent = AGENT;

    const req = makeReq('http://localhost/api/files', {
      method: 'PUT',
      body: JSON.stringify({ agent: 'alpha', path: 'memories/MEMORY.md', content: '# Memory\n' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);

    expect(vi.mocked(fs.writeFile)).toHaveBeenCalledWith(
      '/runtime/agents/alpha/memories/MEMORY.md.tmp',
      '# Memory\n',
      'utf-8',
    );
    expect(vi.mocked(fs.rename)).toHaveBeenCalledWith(
      '/runtime/agents/alpha/memories/MEMORY.md.tmp',
      '/runtime/agents/alpha/memories/MEMORY.md',
    );
  });

  it('rejects AGENTS.md on PUT', async () => {
    mockState.agent = AGENT;

    const req = makeReq('http://localhost/api/files', {
      method: 'PUT',
      body: JSON.stringify({ agent: 'alpha', path: 'AGENTS.md', content: 'legacy' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('returns 422 for invalid YAML in config.yaml', async () => {
    mockState.agent = AGENT;

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
    mockState.agent = AGENT;

    const req = makeReq('http://localhost/api/files', {
      method: 'PUT',
      body: JSON.stringify({ agent: 'alpha', path: 'config.yaml', content: 'name: alpha\n' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
  });

  it('returns 404 when agent not found', async () => {
    mockState.agent = null;

    const req = makeReq('http://localhost/api/files', {
      method: 'PUT',
      body: JSON.stringify({ agent: 'ghost', path: 'SOUL.md', content: 'hello' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(404);
  });

  it('returns 400 for disallowed path', async () => {
    mockState.agent = AGENT;

    const req = makeReq('http://localhost/api/files', {
      method: 'PUT',
      body: JSON.stringify({ agent: 'alpha', path: '../../etc/passwd', content: 'evil' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(400);
  });
});
