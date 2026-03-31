// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  agent: { home: '/runtime/agents/alpha' } as { home: string } | null,
  sessions: [] as unknown[],
}));

vi.mock('@/src/lib/agents', () => ({
  getAgent: vi.fn(async () => mockState.agent),
}));

vi.mock('@/src/lib/state-db', () => ({
  getSessionList: vi.fn((_home: string, _opts?: unknown) => mockState.sessions),
}));

import { GET } from '../../app/api/agents/[id]/sessions/route';

function makeReq(url: string) {
  return new NextRequest(url);
}

describe('GET /api/agents/[id]/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agent = { home: '/runtime/agents/alpha' };
    mockState.sessions = [{ id: 's1' }];
  });

  it('returns 404 when agent not found', async () => {
    mockState.agent = null;
    const res = await GET(makeReq('http://localhost/api/agents/alpha/sessions'), {
      params: Promise.resolve({ id: 'alpha' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 on invalid sort query', async () => {
    const res = await GET(makeReq('http://localhost/api/agents/alpha/sessions?sort=bad'), {
      params: Promise.resolve({ id: 'alpha' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns session list', async () => {
    const res = await GET(
      makeReq('http://localhost/api/agents/alpha/sessions?source=tool&sort=asc'),
      {
        params: Promise.resolve({ id: 'alpha' }),
      },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 's1' }]);
  });
});
