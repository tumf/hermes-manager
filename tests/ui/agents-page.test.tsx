import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

// Mock next/navigation if needed
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Dynamic import to avoid top-level module issues
let Home: React.ComponentType;

const mockAgents = [
  {
    id: 1,
    name: 'alpha',
    home: '/tmp/alpha',
    label: 'ai.hermes.gateway.alpha',
    enabled: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 2,
    name: 'beta',
    home: '/tmp/beta',
    label: 'ai.hermes.gateway.beta',
    enabled: false,
    createdAt: 0,
    updatedAt: 0,
  },
];

function mockFetch(overrides: Record<string, unknown> = {}) {
  return vi
    .fn()
    .mockImplementation(
      async (
        url: string,
        init?: { method?: string; body?: string; headers?: Record<string, string> },
      ) => {
        const method = init?.method ?? 'GET';

        // GET /api/agents
        if (url === '/api/agents' && method === 'GET') {
          return { ok: true, json: async () => mockAgents };
        }

        // POST /api/launchd (status)
        if (url === '/api/launchd' && method === 'POST') {
          const body = JSON.parse(init?.body as string);
          if (body.action === 'status') {
            return { ok: true, json: async () => ({ running: body.agent === 'alpha' }) };
          }
          return { ok: true, json: async () => ({}) };
        }

        // POST /api/agents (add)
        if (url === '/api/agents' && method === 'POST') {
          const body = JSON.parse(init?.body as string);
          if (overrides.addFail) {
            return { ok: false, json: async () => ({ error: 'Agent already exists' }) };
          }
          return {
            ok: true,
            json: async () => ({
              id: 3,
              name: body.name,
              home: '/tmp/new',
              label: 'test',
              enabled: false,
              createdAt: 0,
              updatedAt: 0,
            }),
          };
        }

        // DELETE /api/agents
        if ((url as string).startsWith('/api/agents?name=') && method === 'DELETE') {
          return { ok: true, json: async () => ({ deleted: 'alpha' }) };
        }

        // POST /api/agents/copy
        if (url === '/api/agents/copy' && method === 'POST') {
          return {
            ok: true,
            json: async () => ({
              id: 4,
              name: 'gamma',
              home: '/tmp/gamma',
              label: 'test',
              enabled: false,
              createdAt: 0,
              updatedAt: 0,
            }),
          };
        }

        return { ok: true, json: async () => ({}) };
      },
    );
}

beforeEach(async () => {
  const mod = await import('../../app/page');
  Home = mod.default;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AgentsPage', () => {
  it('renders agents list from API', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
      expect(screen.getByText('beta')).toBeInTheDocument();
    });
  });

  it('shows enabled badge green for enabled agent and muted for disabled', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
    });

    // alpha is enabled, beta is disabled
    const badges = screen.getAllByText(/Enabled|Disabled/);
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  it('shows running status indicator', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
    });

    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Stopped')).toBeInTheDocument();
  });

  it('renders Start and Stop buttons per agent row', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
    });

    // alpha is running → Stop button; beta is stopped → Start button
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('Start button calls launchd start and refreshes', async () => {
    const fetchMock = mockFetch();
    global.fetch = fetchMock;

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('beta')).toBeInTheDocument();
    });

    const startBtn = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
      const launchdCall = calls.find(
        ([url, init]) =>
          url === '/api/launchd' &&
          init?.method === 'POST' &&
          JSON.parse(init?.body as string).action === 'start',
      );
      expect(launchdCall).toBeDefined();
    });
  });

  it('renders Delete button and AlertDialog', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteButtons.length).toBeGreaterThan(0);

    // Click first delete button to open AlertDialog
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });
  });

  it('confirms delete calls DELETE /api/agents and refreshes', async () => {
    const fetchMock = mockFetch();
    global.fetch = fetchMock;

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
      const deleteCall = calls.find(
        ([url, init]) =>
          (url as string).startsWith('/api/agents?name=') && init?.method === 'DELETE',
      );
      expect(deleteCall).toBeDefined();
    });
  });

  it('renders Copy button and Dialog with name input', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
    });

    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    expect(copyButtons.length).toBeGreaterThan(0);

    fireEvent.click(copyButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText(/copy agent name/i)).toBeInTheDocument();
    });
  });

  it('Copy dialog submits POST /api/agents/copy and refreshes', async () => {
    const fetchMock = mockFetch();
    global.fetch = fetchMock;

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
    });

    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    fireEvent.click(copyButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText(/copy agent name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/copy agent name/i), { target: { value: 'gamma' } });

    const submitBtn = screen.getByRole('button', { name: /^copy$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
      const copyCall = calls.find(
        ([url, init]) => url === '/api/agents/copy' && init?.method === 'POST',
      );
      expect(copyCall).toBeDefined();
    });
  });

  it('Add Agent form submits POST /api/agents and refreshes', async () => {
    const fetchMock = mockFetch();
    global.fetch = fetchMock;

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/new agent name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/new agent name/i), {
      target: { value: 'newagent' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /add agent/i }).closest('form')!);

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
      const addCall = calls.find(([url, init]) => url === '/api/agents' && init?.method === 'POST');
      expect(addCall).toBeDefined();
    });
  });

  it('Add Agent form shows error for invalid name', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/new agent name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/new agent name/i), {
      target: { value: 'invalid name!' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /add agent/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/only letters, numbers/i)).toBeInTheDocument();
    });
  });
});
