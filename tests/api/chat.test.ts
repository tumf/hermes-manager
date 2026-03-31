// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  agent: { home: '/runtime/agents/alpha' } as { home: string } | null,
  execShouldFail: false,
}));

vi.mock('@/src/lib/agents', () => ({
  getAgent: vi.fn(async () => mockState.agent),
}));

vi.mock('node:child_process', () => ({
  execFile: vi.fn(
    (
      _cmd: string,
      _args: string[],
      _opts: { env: Record<string, string>; timeout: number },
      cb: (err: Error | null, stdout?: string, stderr?: string) => void,
    ) => {
      if (mockState.execShouldFail) {
        const err = Object.assign(new Error('boom'), { stdout: '', stderr: 'failed' });
        cb(err);
        return;
      }
      cb(null, 'ok', '');
    },
  ),
}));

import { POST } from '../../app/api/agents/[id]/chat/route';
import { execFile } from 'node:child_process';

describe('POST /api/agents/[id]/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agent = { home: '/runtime/agents/alpha' };
    mockState.execShouldFail = false;
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

  it('returns success response', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ message: 'hello', sessionId: 's1' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req as never, { params: Promise.resolve({ id: 'alpha' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(vi.mocked(execFile)).toHaveBeenCalled();
  });
});
