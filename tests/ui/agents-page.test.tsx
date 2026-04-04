import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: toastMocks,
}));

// Mock next/navigation if needed
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Dynamic import to avoid top-level module issues
let Home: React.ComponentType;

const mockAgents = [
  {
    id: 1,
    agentId: 'alpha11',
    home: '/tmp/alpha11',
    label: 'ai.hermes.gateway.alpha11',
    enabled: true,
    createdAt: 0,
    name: 'Alpha Bot',
    description: 'alpha desc',
    tags: ['prod', 'ops'],
    memoryRssBytes: 268435456,
    hermesVersion: 'hermes 1.2.3',
  },
  {
    id: 2,
    agentId: 'beta222',
    home: '/tmp/beta222',
    label: 'ai.hermes.gateway.beta222',
    enabled: false,
    createdAt: 0,
    name: '',
    description: '',
    tags: [],
    memoryRssBytes: null,
    hermesVersion: null,
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
            return { ok: true, json: async () => ({ running: body.agent === 'alpha11' }) };
          }
          if (body.action === 'start' && overrides.launchdStartFail) {
            return {
              ok: false,
              json: async () => ({ stderr: 'Could not find service' }),
            };
          }
          return { ok: true, json: async () => ({}) };
        }

        // POST /api/agents (add — no body needed)
        if (url === '/api/agents' && method === 'POST') {
          if (overrides.addFail) {
            return { ok: false, json: async () => ({ error: 'Failed to generate ID' }) };
          }
          return {
            ok: true,
            json: async () => ({
              id: 3,
              agentId: 'new1234',
              home: '/tmp/new1234',
              label: 'ai.hermes.gateway.new1234',
              enabled: false,
              createdAt: 0,
            }),
          };
        }

        // DELETE /api/agents
        if ((url as string).startsWith('/api/agents?id=') && method === 'DELETE') {
          return { ok: true, json: async () => ({ ok: true }) };
        }

        // POST /api/agents/copy
        if (url === '/api/agents/copy' && method === 'POST') {
          return {
            ok: true,
            json: async () => ({
              id: 4,
              agentId: 'copy123',
              home: '/tmp/copy123',
              label: 'ai.hermes.gateway.copy123',
              enabled: false,
              createdAt: 0,
            }),
          };
        }

        // GET /api/templates
        if ((url as string).startsWith('/api/templates') && method === 'GET') {
          return { ok: true, json: async () => [] };
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
  toastMocks.success.mockReset();
  toastMocks.error.mockReset();
});

describe('AgentsPage', () => {
  it('renders agents list from API', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Bot').length).toBeGreaterThan(0);
      expect(screen.getAllByText('beta222').length).toBeGreaterThan(0);
    });
  });

  it('shows memory and hermes columns in table headers', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Memory')).toBeInTheDocument();
      expect(screen.getByText('Hermes')).toBeInTheDocument();
    });
  });

  it('shows per-agent process info with fallbacks', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('256.0 MB').length).toBeGreaterThan(0);
      expect(screen.getAllByText('hermes 1.2.3').length).toBeGreaterThan(0);
      expect(screen.getAllByText('--').length).toBeGreaterThan(0);
    });
  });

  it('shows metadata tags when present', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('prod').length).toBeGreaterThan(0);
      expect(screen.getAllByText('ops').length).toBeGreaterThan(0);
    });
  });

  it('shows running/stopped badges', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Bot').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Running').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stopped').length).toBeGreaterThan(0);
  });

  it('renders Start and Stop buttons per agent row', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Bot').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByRole('button', { name: /^stop$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^start$/i }).length).toBeGreaterThan(0);
  });

  it('Start button calls launchd start and refreshes', async () => {
    const fetchMock = mockFetch();
    global.fetch = fetchMock;

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('beta222').length).toBeGreaterThan(0);
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

    expect(toastMocks.success).toHaveBeenCalledWith('beta222 started');
  });

  it('Start失敗時にstderrトーストを表示する', async () => {
    global.fetch = mockFetch({ launchdStartFail: true });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('beta222').length).toBeGreaterThan(0);
    });

    const startButtons = screen.getAllByRole('button', { name: /^start$/i });
    fireEvent.click(startButtons[0]);

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith('Could not find service');
    });
  });

  it('renders per-agent action menu buttons', async () => {
    global.fetch = mockFetch();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Bot').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByRole('button', { name: /more actions/i }).length).toBeGreaterThan(0);
  });

  it('Add Agent dialog calls POST /api/agents and refreshes', async () => {
    const fetchMock = mockFetch();
    global.fetch = fetchMock;

    render(<Home />);

    // Click "Add Agent" button to open dialog
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add agent/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /add agent/i }));

    // Wait for dialog to open then click Create button (no name input needed)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
      const addCall = calls.find(([url, init]) => url === '/api/agents' && init?.method === 'POST');
      expect(addCall).toBeDefined();
    });
  });
});
