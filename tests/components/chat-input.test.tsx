import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

import { ChatTab } from '../../src/components/chat-tab';

function mockFetch() {
  return vi
    .fn()
    .mockImplementation(async (url: string, init?: { method?: string; body?: string }) => {
      const method = init?.method ?? 'GET';

      if (url.includes('/api/agents/alpha') && method === 'GET' && !url.includes('/sessions')) {
        return {
          ok: true,
          json: async () => ({
            agentId: 'alpha',
            apiServerStatus: 'connected',
            apiServerAvailable: true,
            apiServerPort: 19001,
          }),
        };
      }

      if (url.includes('/sessions') && !url.includes('/messages') && method === 'GET') {
        return {
          ok: true,
          json: async () => [
            {
              id: 's1',
              source: 'tool',
              title: 'Session A',
              started_at: '2026-01-01T00:00:00Z',
              message_count: 2,
            },
          ],
        };
      }
      if (url.includes('/messages') && method === 'GET') {
        return { ok: true, json: async () => [] };
      }
      if (url.includes('/chat') && method === 'POST') {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode('data: {"choices":[{"delta":{"content":"hello"}}]}\\n\\n'),
            );
            controller.enqueue(new TextEncoder().encode('data: [DONE]\\n\\n'));
            controller.close();
          },
        });
        return {
          ok: true,
          body: stream,
        } as Response;
      }
      return { ok: true, json: async () => ({ ok: true }) };
    });
}

describe('chat input UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = mockFetch() as typeof fetch;
  });

  it('sends message with textarea and enter key', async () => {
    render(<ChatTab name="alpha" />);

    await screen.findByText('Session A');
    const input = screen.getByLabelText('Chat message');
    fireEvent.change(input, { target: { value: 'hello world' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof mockFetch>).mock.calls;
      const chatCall = calls.find(
        ([u, reqInit]) =>
          String(u).includes('/chat') &&
          (reqInit as { method?: string } | undefined)?.method === 'POST',
      );
      expect(chatCall).toBeDefined();
      const body = JSON.parse(((chatCall?.[1] as { body?: string }).body as string) ?? '{}');
      expect(body.message).toBe('hello world');
    });
  });
});
