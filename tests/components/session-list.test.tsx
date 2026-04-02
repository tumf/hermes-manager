import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
      };
    }
    if (url.includes('/messages')) {
      return { ok: true, json: async () => [] };
    }
    return { ok: true, json: async () => ({ ok: true }) };
  });
}

describe('session list UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = mockFetch() as typeof fetch;
  });

  it('renders session list and source filter', async () => {
    render(<ChatTab name="alpha" />);

    expect(await screen.findByText('Session A')).toBeInTheDocument();
    expect(screen.getByText('Session B')).toBeInTheDocument();
    expect(screen.getByLabelText('Source filter')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Source filter'), { target: { value: 'tool' } });

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof mockFetch>).mock.calls;
      expect(calls.some((c) => String(c[0]).includes('source=tool'))).toBe(true);
    });
  });
});
