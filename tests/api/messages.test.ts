// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  agent: { home: '/runtime/agents/alpha' } as { home: string } | null,
  messages: [] as unknown[],
}));

vi.mock('@/src/lib/agents', () => ({
  getAgent: vi.fn(async () => mockState.agent),
}));

vi.mock('@/src/lib/state-db', () => ({
  getMessages: vi.fn(() => mockState.messages),
}));

import { GET } from '../../app/api/agents/[id]/sessions/[sessionId]/messages/route';

describe('GET /api/agents/[id]/sessions/[sessionId]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agent = { home: '/runtime/agents/alpha' };
    mockState.messages = [{ role: 'assistant', content: 'ok' }];
  });

  it('returns 400 for invalid session id', async () => {
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'alpha', sessionId: '../bad' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when agent not found', async () => {
    mockState.agent = null;
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'alpha', sessionId: 's1' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns messages', async () => {
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'alpha', sessionId: 's1' }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ role: 'assistant', content: 'ok' }]);
  });
});
