import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

import { ChatTab } from '../../src/components/chat-tab';
import { buildChatFixtureRoutes } from '../helpers/chat-fixtures';
import { createFetchRouter } from '../helpers/fetch-router';
import { LocaleProvider } from '@/src/components/locale-provider';

function mockFetch() {
  return createFetchRouter(
    buildChatFixtureRoutes({
      sessions: [
        {
          id: 's1',
          source: 'tool',
          title: 'Session A',
          started_at: '2026-01-01T00:00:00Z',
          message_count: 3,
        },
        {
          id: 's2',
          source: 'telegram',
          title: 'Session B',
          started_at: '2026-01-02T00:00:00Z',
          message_count: 1,
        },
      ],
      messages: [],
    }),
  );
}

describe('session list UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = mockFetch() as typeof fetch;
  });

  it('renders session list and source filter', async () => {
    render(
      <LocaleProvider initialLocale="en">
        <ChatTab name="alpha" />
      </LocaleProvider>,
    );

    expect(await screen.findByText('Session A')).toBeInTheDocument();
    expect(screen.getByText('Session B')).toBeInTheDocument();
    expect(screen.getByLabelText('Source filter')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Source filter'), { target: { value: 'tool' } });

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof mockFetch>).mock.calls;
      expect(calls.some((c) => String(c[0]).includes('source=tool'))).toBe(true);
    });
  });

  it('renders normalized session timestamps instead of epoch-based 1970 dates', async () => {
    global.fetch = createFetchRouter(
      buildChatFixtureRoutes({
        sessions: [
          {
            id: 's1',
            source: 'tool',
            title: 'Session A',
            started_at: '2026-01-01T00:00:00.000Z',
            message_count: 3,
          },
          {
            id: 's2',
            source: 'telegram',
            title: 'Session B',
            started_at: '2026-01-02T00:00:00.000Z',
            message_count: 1,
          },
        ],
        messages: [],
      }),
    ) as typeof fetch;

    render(
      <LocaleProvider initialLocale="en">
        <ChatTab name="alpha" />
      </LocaleProvider>,
    );

    expect(await screen.findByText('Session A')).toBeInTheDocument();
    expect(screen.getAllByText(/2026/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/1970/)).not.toBeInTheDocument();
  });
});
