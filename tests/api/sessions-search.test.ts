// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  agent: { home: '/runtime/agents/alpha' } as { home: string } | null,
  searchResults: [] as unknown[],
}));

vi.mock('@/src/lib/agents', () => ({
  getAgent: vi.fn(async () => mockState.agent),
}));

vi.mock('@/src/lib/state-db', () => ({
  searchSessionMessages: vi.fn(() => mockState.searchResults),
}));

import { GET } from '../../app/api/agents/[id]/sessions/search/route';

function makeReq(url: string) {
  return new NextRequest(url);
}

describe('GET /api/agents/[id]/sessions/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agent = { home: '/runtime/agents/alpha' };
    mockState.searchResults = [
      {
        sessionId: 's1',
        source: 'tool',
        title: 'Session 1',
        messageCount: 2,
        startedAt: '2026-01-01T00:00:00Z',
        match: {
          messageId: 1,
          role: 'user',
          timestamp: '2026-01-01T00:00:01Z',
          snippet: '...error in <mark>gateway</mark>...',
        },
      },
    ];
  });

  it('returns 404 when agent not found', async () => {
    mockState.agent = null;
    const res = await GET(makeReq('http://localhost/api/agents/alpha/sessions/search?q=test'), {
      params: Promise.resolve({ id: 'alpha' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 when query is missing', async () => {
    const res = await GET(makeReq('http://localhost/api/agents/alpha/sessions/search'), {
      params: Promise.resolve({ id: 'alpha' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when query is too short', async () => {
    const res = await GET(makeReq('http://localhost/api/agents/alpha/sessions/search?q=a'), {
      params: Promise.resolve({ id: 'alpha' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns search results for valid query', async () => {
    const res = await GET(
      makeReq('http://localhost/api/agents/alpha/sessions/search?q=gateway&source=tool'),
      { params: Promise.resolve({ id: 'alpha' }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].sessionId).toBe('s1');
    expect(data[0].match.snippet).toContain('<mark>gateway</mark>');
  });
});
