import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

import { ChatTab } from '../../src/components/chat-tab';
import { buildChatFixtureRoutes } from '../helpers/chat-fixtures';
import { createFetchRouter } from '../helpers/fetch-router';

function mockFetch() {
  return createFetchRouter(
    buildChatFixtureRoutes({
      messages: [],
    }),
  );
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
