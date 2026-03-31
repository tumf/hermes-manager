import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

import { ChatTab } from '../../src/components/chat-tab';

function mockFetch() {
  return vi
    .fn()
    .mockImplementation(async (url: string, init?: { method?: string; body?: string }) => {
      const method = init?.method ?? 'GET';
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
        return { ok: true, json: async () => ({ ok: true, stdout: 'ok' }) };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    });
}

describe('chat input UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = mockFetch() as typeof fetch;
  });

  it('sends message with input and resume toggle', async () => {
    render(<ChatTab name="alpha" />);

    await screen.findByText('Session A');
    fireEvent.change(screen.getByLabelText('Chat message'), { target: { value: 'hello world' } });
    fireEvent.click(screen.getByLabelText('選択セッションを再開する'));
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof mockFetch>).mock.calls;
      const chatCall = calls.find(
        ([u, init]) =>
          String(u).includes('/chat') &&
          (init as { method?: string } | undefined)?.method === 'POST',
      );
      expect(chatCall).toBeDefined();
      const body = JSON.parse(((chatCall?.[1] as { body?: string }).body as string) ?? '{}');
      expect(body.message).toBe('hello world');
      expect(body.sessionId).toBeUndefined();
    });
  });
});
