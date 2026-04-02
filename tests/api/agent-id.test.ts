// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  agent: {
    agentId: 'alpha',
    home: '/runtime/agents/alpha',
    label: 'ai.hermes.gateway.alpha',
    enabled: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    name: 'Alpha',
    description: '',
    tags: [],
    apiServerStatus: 'configured-needs-restart' as const,
    apiServerAvailable: false,
    apiServerPort: null,
  },
}));

vi.mock('@/src/lib/agents', () => ({
  getAgent: vi.fn(async () => mockState.agent),
}));

import { GET } from '../../app/api/agents/[id]/route';

describe('GET /api/agents/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns apiServerStatus in payload', async () => {
    const res = await GET(new Request('http://localhost') as never, {
      params: Promise.resolve({ id: 'alpha' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.apiServerStatus).toBe('configured-needs-restart');
    expect(body.apiServerAvailable).toBe(false);
  });

  it('returns 400 for traversal-like id', async () => {
    const res = await GET(new Request('http://localhost') as never, {
      params: Promise.resolve({ id: '../etc' }),
    });

    expect(res.status).toBe(400);
  });
});
