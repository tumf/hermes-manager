// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  agent: {
    home: '/runtime/agents/alpha',
    apiServerAvailable: true,
    apiServerPort: 19001,
  } as {
    home: string;
    apiServerAvailable: boolean;
    apiServerPort: number | null;
  } | null,
}));

vi.mock('@/src/lib/agents', () => ({
  getAgent: vi.fn(async () => mockState.agent),
}));

import { POST } from '../../app/api/agents/[id]/chat/route';

describe('POST /api/agents/[id]/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agent = {
      home: '/runtime/agents/alpha',
      apiServerAvailable: true,
      apiServerPort: 19001,
    };
  });

  it('returns 400 for invalid body', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ message: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req as never, { params: Promise.resolve({ id: 'alpha' }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 when agent not found', async () => {
    mockState.agent = null;
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ message: 'hello' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req as never, { params: Promise.resolve({ id: 'alpha' }) });
    expect(res.status).toBe(404);
  });

  it('returns 503 when api_server unavailable', async () => {
    mockState.agent = {
      home: '/runtime/agents/alpha',
      apiServerAvailable: false,
      apiServerPort: null,
    };
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ message: 'hello' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as never, { params: Promise.resolve({ id: 'alpha' }) });
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: 'api_server not available' });
  });

  it('proxies stream response', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n'),
        );
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    global.fetch = vi.fn(
      async () =>
        new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }),
    ) as typeof fetch;

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ message: 'hello' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req as never, { params: Promise.resolve({ id: 'alpha' }) });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:19001/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
