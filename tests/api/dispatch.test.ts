// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  agents: new Map<
    string,
    {
      agentId: string;
      home: string;
      name: string;
      description: string;
      tags: string[];
      apiServerStatus: string;
      apiServerPort: number | null;
      apiServerAvailable: boolean;
    }
  >([
    [
      'planner01',
      {
        agentId: 'planner01',
        home: '/runtime/agents/planner01',
        name: 'Planner',
        description: '',
        tags: [],
        apiServerStatus: 'connected',
        apiServerPort: 8642,
        apiServerAvailable: true,
      },
    ],
    [
      'research01',
      {
        agentId: 'research01',
        home: '/runtime/agents/research01',
        name: 'Research',
        description: '',
        tags: [],
        apiServerStatus: 'connected',
        apiServerPort: 8643,
        apiServerAvailable: true,
      },
    ],
    [
      'offline01',
      {
        agentId: 'offline01',
        home: '/runtime/agents/offline01',
        name: 'Offline',
        description: '',
        tags: [],
        apiServerStatus: 'disabled',
        apiServerPort: null,
        apiServerAvailable: false,
      },
    ],
  ]),
  policy: { allowedAgents: ['research01', 'offline01'], maxHop: 3 } as {
    allowedAgents: string[];
    maxHop: number;
  },
}));

vi.mock('@/src/lib/agents', () => ({
  getAgent: vi.fn(async (id: string) => mockState.agents.get(id) ?? null),
}));

vi.mock('@/src/lib/runtime-paths', () => ({
  getRuntimeAgentsRootPath: (...segments: string[]) => {
    const base = '/runtime/agents';
    return segments.length > 0 ? `${base}/${segments.join('/')}` : base;
  },
}));

vi.mock('@/src/lib/delegation', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    readDelegationPolicy: vi.fn(async () => mockState.policy),
  };
});

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { POST } from '../../app/api/agents/[id]/dispatch/route';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/agents/[id]/dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.policy = { allowedAgents: ['research01', 'offline01'], maxHop: 3 };
  });

  it('dispatches to allowed target', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n'),
        );
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce(new Response(stream, { status: 200 }));

    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        targetAgent: 'research01',
        message: 'hello',
        dispatchPath: ['planner01'],
        hopCount: 0,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, makeContext('planner01'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');
  });

  it('rejects unlisted target with 403', async () => {
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        targetAgent: 'unknown-agent',
        message: 'hello',
        dispatchPath: [],
        hopCount: 0,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, makeContext('planner01'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('not allowed');
  });

  it('rejects revisit with 403', async () => {
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        targetAgent: 'research01',
        message: 'hello',
        dispatchPath: ['planner01', 'research01'],
        hopCount: 1,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, makeContext('planner01'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('revisit');
  });

  it('rejects maxHop violation with 403', async () => {
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        targetAgent: 'research01',
        message: 'hello',
        dispatchPath: ['planner01'],
        hopCount: 3,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, makeContext('planner01'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('maxHop');
  });

  it('returns 503 when target api_server unavailable', async () => {
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        targetAgent: 'offline01',
        message: 'hello',
        dispatchPath: [],
        hopCount: 0,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, makeContext('planner01'));
    expect(res.status).toBe(503);
  });

  it('returns 404 for unknown source agent', async () => {
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        targetAgent: 'research01',
        message: 'hello',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, makeContext('unknown'));
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: 'not json',
    });
    const res = await POST(req, makeContext('planner01'));
    expect(res.status).toBe(400);
  });
});
