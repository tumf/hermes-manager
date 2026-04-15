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
      messages: [
        {
          session_id: 's1',
          role: 'user',
          content: 'hello',
          timestamp: '2026-01-01T00:00:01Z',
          tool_name: null,
        },
        {
          session_id: 's1',
          role: 'assistant',
          content: '',
          timestamp: '2026-01-01T00:00:015Z',
          tool_name: null,
        },
        {
          session_id: 's1',
          role: 'tool',
          content: '{"query":"ping"}',
          timestamp: '2026-01-01T00:00:017Z',
          tool_name: 'search',
        },
        {
          session_id: 's1',
          role: 'assistant',
          content: 'hi',
          timestamp: '2026-01-01T00:00:02Z',
          tool_name: null,
        },
      ],
    }),
  );
}

describe('chat messages UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = mockFetch() as typeof fetch;
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 900,
    });

<<<<<<< Updated upstream
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
=======
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
>>>>>>> Stashed changes
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
  });

  it('renders role based chat bubbles', async () => {
    render(
      <LocaleProvider initialLocale="en">
        <ChatTab name="alpha" />
      </LocaleProvider>,
    );

    expect(await screen.findByText('hello')).toBeInTheDocument();
    expect(screen.getByText('hi')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('assistant')).toBeInTheDocument();
    expect(screen.queryAllByText('assistant')).toHaveLength(1);
  });

  it('collapses tool calls by default', async () => {
    render(
      <LocaleProvider initialLocale="en">
        <ChatTab name="alpha" />
      </LocaleProvider>,
    );

    expect(await screen.findByText('search')).toBeInTheDocument();
    expect(screen.queryByText('{"query":"ping"}')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(screen.getByText('{"query":"ping"}')).toBeInTheDocument();
  });

  it('keeps only chat history scrollable and leaves the composer visible in the viewport', async () => {
<<<<<<< Updated upstream
    render(
      <LocaleProvider initialLocale="en">
        <ChatTab name="alpha" />
      </LocaleProvider>,
    );
=======
    render(<ChatTab name="alpha" />);
>>>>>>> Stashed changes

    const messagesScroll = await screen.findByTestId('chat-messages-scroll');
    const composer = screen.getByTestId('chat-input-composer');

    await waitFor(() => {
      expect(messagesScroll.style.height).toBe('588px');
    });

    expect(messagesScroll).toHaveClass('overflow-y-auto');
    expect(composer).toHaveClass('shrink-0');
  });
});
