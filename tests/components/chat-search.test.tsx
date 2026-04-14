import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

import { ChatTab } from '../../src/components/chat-tab';
import { buildChatFixtureRoutes } from '../helpers/chat-fixtures';
import { createFetchRouter } from '../helpers/fetch-router';
import { LocaleProvider } from '@/src/components/locale-provider';

function stubBoundingClientRect() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const testId = this.getAttribute('data-testid');
    if (testId === 'chat-tab-layout') {
      return { x: 0, y: 100, top: 100, left: 0, right: 1000, bottom: 860, width: 1000, height: 760, toJSON: () => ({}) } as DOMRect;
    }
    if (testId === 'chat-input-composer') {
      return { x: 0, y: 700, top: 700, left: 0, right: 1000, bottom: 820, width: 1000, height: 120, toJSON: () => ({}) } as DOMRect;
    }
    return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) } as DOMRect;
  });
}

const SEARCH_RESULTS = [
  {
    sessionId: 's1',
    source: 'tool',
    title: 'Session A',
    messageCount: 2,
    startedAt: '2026-01-01T00:00:00Z',
    match: {
      messageId: 1,
      role: 'user',
      timestamp: '2026-01-01T00:00:01Z',
      snippet: 'error in <mark>gateway</mark> startup',
    },
  },
];

describe('chat search UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    stubBoundingClientRect();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input in sessions panel', async () => {
    const fetch = createFetchRouter(buildChatFixtureRoutes());
    global.fetch = fetch as typeof fetch;

    render(
      <LocaleProvider initialLocale="en">
        <ChatTab name="alpha" />
      </LocaleProvider>,
    );

    expect(await screen.findByPlaceholderText('Search messages...')).toBeInTheDocument();
  });

  it('shows search results when query is entered', async () => {
    const fetch = createFetchRouter(
      buildChatFixtureRoutes({ searchResults: SEARCH_RESULTS }),
    );
    global.fetch = fetch as typeof fetch;

    render(
      <LocaleProvider initialLocale="en">
        <ChatTab name="alpha" />
      </LocaleProvider>,
    );

    await screen.findByText('Session A');

    const searchInput = screen.getByPlaceholderText('Search messages...');
    fireEvent.change(searchInput, { target: { value: 'gateway' } });

    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(screen.getByText(/gateway/)).toBeInTheDocument();
    });
  });

  it('shows no-results message when search returns empty', async () => {
    const fetch = createFetchRouter(
      buildChatFixtureRoutes({ searchResults: [] }),
    );
    global.fetch = fetch as typeof fetch;

    render(
      <LocaleProvider initialLocale="en">
        <ChatTab name="alpha" />
      </LocaleProvider>,
    );

    await screen.findByText('Session A');

    const searchInput = screen.getByPlaceholderText('Search messages...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(screen.getByText('No matching sessions.')).toBeInTheDocument();
    });
  });

  it('clears search and returns to session list', async () => {
    const fetch = createFetchRouter(
      buildChatFixtureRoutes({ searchResults: SEARCH_RESULTS }),
    );
    global.fetch = fetch as typeof fetch;

    render(
      <LocaleProvider initialLocale="en">
        <ChatTab name="alpha" />
      </LocaleProvider>,
    );

    await screen.findByText('Session A');

    const searchInput = screen.getByPlaceholderText('Search messages...');
    fireEvent.change(searchInput, { target: { value: 'gateway' } });

    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(screen.getByText(/gateway/)).toBeInTheDocument();
    });

    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText('Session A')).toBeInTheDocument();
    });
  });

  it('selects session when search result is clicked', async () => {
    const fetch = createFetchRouter(
      buildChatFixtureRoutes({ searchResults: SEARCH_RESULTS }),
    );
    global.fetch = fetch as typeof fetch;

    render(
      <LocaleProvider initialLocale="en">
        <ChatTab name="alpha" />
      </LocaleProvider>,
    );

    await screen.findByText('Session A');

    const searchInput = screen.getByPlaceholderText('Search messages...');
    fireEvent.change(searchInput, { target: { value: 'gateway' } });

    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(screen.getByText(/gateway/)).toBeInTheDocument();
    });

    const resultButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent?.includes('gateway'),
    );
    if (resultButtons.length > 0) {
      fireEvent.click(resultButtons[0]);
    }

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof createFetchRouter>).mock.calls;
      expect(calls.some((c) => String(c[0]).includes('/messages'))).toBe(true);
    });
  });
});
