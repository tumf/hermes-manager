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
          if (body.action === 'start' && overrides.launchdStartFail) {
            return {
              ok: false,
              json: async () => ({ stderr: 'Could not find service "ai.hermes.gateway.beta"' }),
            };
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
      expect(screen.getAllByText('alpha').length).toBeGreaterThan(0);
      expect(screen.getAllByText('beta').length).toBeGreaterThan(0);
    });
  });

  it('shows running/stopped badges', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('alpha').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Running').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stopped').length).toBeGreaterThan(0);
  });

  it('shows running status indicator', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('alpha').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Running').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stopped').length).toBeGreaterThan(0);
  });

  it('renders Start and Stop buttons per agent row', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('alpha').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByRole('button', { name: /^stop$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^start$/i }).length).toBeGreaterThan(0);
  });

  it('Start button calls launchd start and refreshes', async () => {
    const fetchMock = mockFetch();
    global.fetch = fetchMock;

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('beta').length).toBeGreaterThan(0);
    });

    const startButtons = screen.getAllByRole('button', { name: /^start$/i });
    fireEvent.click(startButtons[0]);

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

  it('does not report success when launchd start fails', async () => {
    const fetchMock = mockFetch({
      launchdStartFail: true,
    });
    global.fetch = fetchMock;

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('beta').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole('button', { name: /^start$/i })[0]);

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
      const refreshCalls = calls.filter(
        ([url, init]) => url === '/api/agents' && (init?.method ?? 'GET') === 'GET',
      );
      expect(refreshCalls).toHaveLength(1);
    });
  });

  it('renders per-agent action menu buttons', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('alpha').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByRole('button', { name: /more actions/i }).length).toBeGreaterThan(0);
  });

  it('action menu buttons are rendered for agents', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('alpha').length).toBeGreaterThan(0);
    });

    const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
    expect(actionButtons.length).toBeGreaterThan(0);
  });

  it('action menu button is clickable', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('alpha').length).toBeGreaterThan(0);
    });

    const actionButton = screen.getAllByRole('button', { name: /more actions/i })[0];
    fireEvent.click(actionButton);
    expect(actionButton).toBeInTheDocument();
  });

  it('copy flow entrypoint (action menu) is available', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('alpha').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByRole('button', { name: /more actions/i }).length).toBeGreaterThan(0);
  });

  it('Add Agent form submits POST /api/agents and refreshes', async () => {
    const fetchMock = mockFetch();
    global.fetch = fetchMock;

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/new-agent-name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/new-agent-name/i), {
      target: { value: 'newagent' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /add agent/i }).closest('form')!);

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
      const addCall = calls.find(([url, init]) => url === '/api/agents' && init?.method === 'POST');
      expect(addCall).toBeDefined();
    });
  });

  it('Add Agent form rejects invalid name without POST /api/agents', async () => {
    const fetchMock = mockFetch();
    global.fetch = fetchMock;

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/new-agent-name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/new-agent-name/i), {
      target: { value: 'invalid name!' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /add agent/i }).closest('form')!);

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
      const addPostCalls = calls.filter(
        ([url, init]) => url === '/api/agents' && (init?.method ?? 'GET') === 'POST',
      );
      expect(addPostCalls).toHaveLength(0);
    });
  });
});
