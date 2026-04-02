import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

import { ChatTab } from '../../src/components/chat-tab';

function mockFetch() {
  return vi.fn().mockImplementation(async (url: string) => {
    if (url.includes('/api/agents/alpha') && !url.includes('/sessions')) {
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

    if (url.includes('/sessions') && !url.includes('/messages')) {
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
    if (url.includes('/messages')) {
      return {
        ok: true,
        json: async () => [
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
      };
    }
    return { ok: true, json: async () => ({ ok: true }) };
  });
}

describe('chat messages UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = mockFetch() as typeof fetch;
  });

  it('renders role based chat bubbles', async () => {
    render(<ChatTab name="alpha" />);

    expect(await screen.findByText('hello')).toBeInTheDocument();
    expect(screen.getByText('hi')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('assistant')).toBeInTheDocument();
    expect(screen.queryAllByText('assistant')).toHaveLength(1);
  });

  it('collapses tool calls by default', async () => {
    render(<ChatTab name="alpha" />);

    expect(await screen.findByText('search')).toBeInTheDocument();
    expect(screen.queryByText('{"query":"ping"}')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(screen.getByText('{"query":"ping"}')).toBeInTheDocument();
  });
});
