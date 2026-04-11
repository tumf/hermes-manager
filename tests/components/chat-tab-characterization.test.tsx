import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

import { ChatTab } from '../../src/components/chat-tab';
import { buildChatFixtureRoutes, MessageRow } from '../helpers/chat-fixtures';
import { createFetchRouter } from '../helpers/fetch-router';
import { LocaleProvider } from '@/src/components/locale-provider';

function stubBoundingClientRect() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const testId = this.getAttribute('data-testid');
    if (testId === 'chat-tab-layout') {
      return {
        x: 0,
        y: 100,
        top: 100,
        left: 0,
        right: 1000,
        bottom: 860,
        width: 1000,
        height: 760,
        toJSON: () => ({}),
      } as DOMRect;
    }
    if (testId === 'chat-input-composer') {
      return {
        x: 0,
        y: 700,
        top: 700,
        left: 0,
        right: 1000,
        bottom: 820,
        width: 1000,
        height: 120,
        toJSON: () => ({}),
      } as DOMRect;
    }
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      toJSON: () => ({}),
    } as DOMRect;
  });
}

describe('chat tab characterization: streaming', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    stubBoundingClientRect();
  });

  it('concatenates SSE deltas into the visible assistant message', async () => {
    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;

    const fetch = createFetchRouter(
      buildChatFixtureRoutes({
        messages: [],
        onChatPost: () => {
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              streamController = controller;
            },
          });
          return { ok: true, body: stream };
        },
      }),
    );
    global.fetch = fetch as typeof fetch;

    render(
      <LocaleProvider initialLocale="en">
        <ChatTab name="alpha" />
      </LocaleProvider>,
    );

    await screen.findByText('Session A');

    const input = screen.getByLabelText('Chat message');
    fireEvent.change(input, { target: { value: 'test prompt' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(streamController).not.toBeNull());

    const encoder = new TextEncoder();
    await act(async () => {
      streamController!.enqueue(
        encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    await act(async () => {
      streamController!.enqueue(
        encoder.encode('data: {"choices":[{"delta":{"content":" world"}}]}\n\n'),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    await act(async () => {
      streamController!.enqueue(encoder.encode('data: [DONE]\n\n'));
      streamController!.close();
    });
  });

  it('reloads sessions and messages after streaming completes', async () => {
    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;

    const fetch = createFetchRouter(
      buildChatFixtureRoutes({
        messages: [],
        onChatPost: () => {
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              streamController = controller;
            },
          });
          return { ok: true, body: stream };
        },
      }),
    );
    global.fetch = fetch as typeof fetch;

    render(
      <LocaleProvider initialLocale="en">
        <ChatTab name="alpha" />
      </LocaleProvider>,
    );

    await screen.findByText('Session A');

    const callCountBefore = fetch.mock.calls.filter((c) =>
      String(c[0]).includes('/sessions'),
    ).length;

    const input = screen.getByLabelText('Chat message');
    fireEvent.change(input, { target: { value: 'hi' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(streamController).not.toBeNull());

    const encoder = new TextEncoder();
    await act(async () => {
      streamController!.enqueue(encoder.encode('data: [DONE]\n\n'));
      streamController!.close();
    });

    await waitFor(() => {
      const callCountAfter = fetch.mock.calls.filter((c) =>
        String(c[0]).includes('/sessions'),
      ).length;
      expect(callCountAfter).toBeGreaterThan(callCountBefore);
    });
  });
});

describe('chat tab characterization: retry', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    stubBoundingClientRect();
  });

  it('shows retry button after send failure and re-sends the last user message', async () => {
    let callCount = 0;
    const fetch = createFetchRouter(
      buildChatFixtureRoutes({
        messages: [],
        onChatPost: () => {
          callCount++;
          if (callCount === 1) {
            return { ok: false, json: async () => ({ error: 'server error' }) };
          }
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n'),
              );
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
              controller.close();
            },
          });
          return { ok: true, body: stream };
        },
      }),
    );
    global.fetch = fetch as typeof fetch;

    render(
      <LocaleProvider initialLocale="en">
        <ChatTab name="alpha" />
      </LocaleProvider>,
    );

    await screen.findByText('Session A');

    const input = screen.getByLabelText('Chat message');
    fireEvent.change(input, { target: { value: 'fail me' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    const retryButton = await screen.findByRole('button', { name: 'Retry' });
    expect(screen.getByText('Failed to send.')).toBeInTheDocument();

    fireEvent.click(retryButton);

    await waitFor(() => {
      const chatPosts = fetch.mock.calls.filter(
        ([u, init]) =>
          String(u).includes('/chat') &&
          (init as { method?: string } | undefined)?.method === 'POST',
      );
      expect(chatPosts).toHaveLength(2);
      const secondBody = JSON.parse(
        ((chatPosts[1][1] as { body?: string }).body as string) ?? '{}',
      );
      expect(secondBody.message).toBe('fail me');
    });
  });
});

describe('chat tab characterization: session selection', () => {
  const sessionsFixture = [
    {
      id: 's1',
      source: 'tool',
      title: 'Session A',
      started_at: '2026-01-01T00:00:00Z',
      message_count: 2,
    },
    {
      id: 's2',
      source: 'telegram',
      title: 'Session B',
      started_at: '2026-01-02T00:00:00Z',
      message_count: 1,
    },
  ];

  const messagesForS2: MessageRow[] = [
    {
      session_id: 's2',
      role: 'user',
      content: 'session-b-message',
      timestamp: '2026-01-02T00:00:01Z',
      tool_name: null,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    stubBoundingClientRect();
  });

  it('loads messages when a different session is selected', async () => {
    const fetch = createFetchRouter(
      buildChatFixtureRoutes({
        sessions: sessionsFixture,
        messages: messagesForS2,
      }),
    );
    global.fetch = fetch as typeof fetch;

    render(
      <LocaleProvider initialLocale="en">
        <ChatTab name="alpha" />
      </LocaleProvider>,
    );

    await screen.findByText('Session A');
    expect(screen.getByText('Session B')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Session B'));

    await waitFor(() => {
      expect(screen.getByText('session-b-message')).toBeInTheDocument();
    });
  });
});

describe('chat tab characterization: mobile sessions panel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    stubBoundingClientRect();
  });

  it('opens mobile sessions panel and closes on session select', async () => {
    const fetch = createFetchRouter(
      buildChatFixtureRoutes({
        sessions: [
          {
            id: 's1',
            source: 'tool',
            title: 'Session A',
            started_at: '2026-01-01T00:00:00Z',
            message_count: 2,
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
    global.fetch = fetch as typeof fetch;

    render(
      <LocaleProvider initialLocale="en">
        <ChatTab name="alpha" />
      </LocaleProvider>,
    );

    await screen.findByText('Session A');

    const sessionsButtons = screen.getAllByRole('button', { name: /Sessions/i });
    const mobileToggle = sessionsButtons.find((btn) => btn.textContent?.includes('Sessions'));
    expect(mobileToggle).toBeDefined();

    fireEvent.click(mobileToggle!);

    const closeButtons = screen.getAllByRole('button', { name: 'Close sessions' });
    expect(closeButtons.length).toBeGreaterThan(0);

    const sessionButtons = screen.getAllByText('Session B');
    const overlaySessionButton = sessionButtons[sessionButtons.length - 1];
    fireEvent.click(overlaySessionButton);

    await waitFor(() => {
      const closeButtonsAfter = screen.queryAllByRole('button', { name: 'Close sessions' });
      const overlayStillVisible = closeButtonsAfter.some((btn) => {
        const parent = btn.closest('.fixed');
        return parent !== null;
      });
      expect(overlayStillVisible).toBe(false);
    });
  });
});
