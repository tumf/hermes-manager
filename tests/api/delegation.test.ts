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
        description: 'Research agent',
        tags: ['research'],
        apiServerStatus: 'connected',
        apiServerPort: 8643,
        apiServerAvailable: true,
      },
    ],
  ]),
  delegationPolicies: new Map<string, { allowedAgents: string[]; maxHop: number }>(),
  syncCalled: false,
}));

vi.mock('@/src/lib/agents', () => ({
  getAgent: vi.fn(async (id: string) => mockState.agents.get(id) ?? null),
  agentExists: vi.fn(async (id: string) => mockState.agents.has(id)),
  listAgents: vi.fn(async () => Array.from(mockState.agents.values())),
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
    readDelegationPolicy: vi.fn(async (agentHome: string) => {
      const id = agentHome.split('/').pop() ?? '';
      return mockState.delegationPolicies.get(id) ?? { allowedAgents: [], maxHop: 3 };
    }),
    writeDelegationPolicy: vi.fn(
      async (_home: string, policy: { allowedAgents: string[]; maxHop: number }) => {
        const id = _home.split('/').pop() ?? '';
        mockState.delegationPolicies.set(id, policy);
      },
    ),
    loadAllDelegationEdges: vi.fn(async () => {
      const edges = new Map<string, string[]>();
      for (const [id, policy] of mockState.delegationPolicies) {
        if (policy.allowedAgents.length > 0) {
          edges.set(id, policy.allowedAgents);
        }
      }
      return edges;
    }),
  };
});

vi.mock('@/src/lib/delegation-sync', () => ({
  syncDelegationForAgent: vi.fn(async () => {
    mockState.syncCalled = true;
  }),
}));

import { GET, PUT } from '../../app/api/agents/[id]/delegation/route';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/agents/[id]/delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.delegationPolicies.clear();
    mockState.syncCalled = false;
  });

  it('returns policy and available agents', async () => {
    const res = await GET(new Request('http://localhost'), makeContext('planner01'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.policy).toEqual({ allowedAgents: [], maxHop: 3 });
    expect(body.availableAgents).toHaveLength(1);
    expect(body.availableAgents[0].id).toBe('research01');
  });

  it('returns 404 for unknown agent', async () => {
    const res = await GET(new Request('http://localhost'), makeContext('unknown'));
    expect(res.status).toBe(404);
  });

  it('returns 400 for path traversal', async () => {
    const res = await GET(new Request('http://localhost'), makeContext('../etc'));
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/agents/[id]/delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.delegationPolicies.clear();
    mockState.syncCalled = false;
  });

  it('saves valid policy', async () => {
    const req = new NextRequest('http://localhost', {
      method: 'PUT',
      body: JSON.stringify({ allowedAgents: ['research01'], maxHop: 3 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, makeContext('planner01'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.policy.allowedAgents).toEqual(['research01']);
    expect(mockState.syncCalled).toBe(true);
  });

  it('rejects self-targeting', async () => {
    const req = new NextRequest('http://localhost', {
      method: 'PUT',
      body: JSON.stringify({ allowedAgents: ['planner01'], maxHop: 3 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, makeContext('planner01'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('itself');
  });

  it('rejects non-existent target', async () => {
    const req = new NextRequest('http://localhost', {
      method: 'PUT',
      body: JSON.stringify({ allowedAgents: ['nonexistent'], maxHop: 3 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, makeContext('planner01'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('does not exist');
  });

  it('rejects cyclic policy', async () => {
    mockState.delegationPolicies.set('research01', {
      allowedAgents: ['planner01'],
      maxHop: 3,
    });
    const req = new NextRequest('http://localhost', {
      method: 'PUT',
      body: JSON.stringify({ allowedAgents: ['research01'], maxHop: 3 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, makeContext('planner01'));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain('cycle');
  });

  it('returns 404 for unknown agent', async () => {
    const req = new NextRequest('http://localhost', {
      method: 'PUT',
      body: JSON.stringify({ allowedAgents: [], maxHop: 3 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, makeContext('unknown'));
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new NextRequest('http://localhost', {
      method: 'PUT',
      body: 'not json',
    });
    const res = await PUT(req, makeContext('planner01'));
    expect(res.status).toBe(400);
  });
});
