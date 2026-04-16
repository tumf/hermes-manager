import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

import { LocaleProvider } from '@/src/components/locale-provider';

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
          return {
            ok: true,
            json: async () =>
              mockAgents.map((agent) => {
                const rest = { ...agent };
                delete (rest as Partial<typeof agent>).hermesVersion;
                return {
                  ...rest,
                  apiServerAvailable: false,
                  apiServerPort: null,
                };
              }),
          };
        }

        if ((url as string).startsWith('/api/agents/') && method === 'GET') {
          const agentId = (url as string).split('/').pop() ?? '';
          const agent = mockAgents.find((item) => item.agentId === agentId);
          if (!agent) {
            return { ok: false, json: async () => ({ error: 'not found' }) };
          }
          return {
            ok: true,
            json: async () => ({
              ...agent,
              apiServerAvailable: false,
              apiServerPort: null,
            }),
          };
        }

        // POST /api/launchd/statuses (batch status)
        if (url === '/api/launchd/statuses' && method === 'POST') {
          if (overrides.batchStatusFail) {
            return { ok: false, json: async () => ({ error: 'boom' }) };
          }
          const body = JSON.parse(init?.body as string);
          const requested = Array.isArray(body.agents) ? (body.agents as string[]) : [];
          return {
            ok: true,
            json: async () => ({
              statuses: requested.map((agentId) => ({
                agent: agentId,
                running: agentId === 'alpha11',
                pid: agentId === 'alpha11' ? 42 : null,
                code: 0,
                manager: 'launchd',
              })),
            }),
          };
        }

        // POST /api/launchd (per-agent actions only)
        if (url === '/api/launchd' && method === 'POST') {
          const body = JSON.parse(init?.body as string);
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

    render(
      <LocaleProvider initialLocale="en">
        <Home />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Bot').length).toBeGreaterThan(0);
      expect(screen.getAllByText('beta222').length).toBeGreaterThan(0);
    });
  });

  it('shows memory column in table headers', async () => {
    global.fetch = mockFetch();

    render(
      <LocaleProvider initialLocale="en">
        <Home />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Memory')).toBeInTheDocument();
      expect(screen.queryByText('Hermes')).not.toBeInTheDocument();
    });
  });

  it('shows per-agent process info with fallbacks', async () => {
    global.fetch = mockFetch();

    render(
      <LocaleProvider initialLocale="en">
        <Home />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('256.0 MB').length).toBeGreaterThan(0);
      expect(screen.queryByText('hermes 1.2.3')).not.toBeInTheDocument();
      expect(screen.getAllByText('--').length).toBeGreaterThan(0);
    });
  });

  it('shows metadata tags when present', async () => {
    global.fetch = mockFetch();

    render(
      <LocaleProvider initialLocale="en">
        <Home />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('prod').length).toBeGreaterThan(0);
      expect(screen.getAllByText('ops').length).toBeGreaterThan(0);
    });
  });

  it('shows running/stopped badges', async () => {
    global.fetch = mockFetch();

    render(
      <LocaleProvider initialLocale="en">
        <Home />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Bot').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Running').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stopped').length).toBeGreaterThan(0);
  });

  it('renders Start and Stop buttons per agent row', async () => {
    global.fetch = mockFetch();

    render(
      <LocaleProvider initialLocale="en">
        <Home />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Bot').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByRole('button', { name: /^stop$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^start$/i }).length).toBeGreaterThan(0);
  });

  it('Start button calls launchd start and refreshes', async () => {
    const fetchMock = mockFetch();
    global.fetch = fetchMock;

    render(
      <LocaleProvider initialLocale="en">
        <Home />
      </LocaleProvider>,
    );

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

    render(
      <LocaleProvider initialLocale="en">
        <Home />
      </LocaleProvider>,
    );

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

    render(
      <LocaleProvider initialLocale="en">
        <Home />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Bot').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByRole('button', { name: /more actions/i }).length).toBeGreaterThan(0);
  });

  it('issues a single batch status call after /api/agents', async () => {
    const fetchMock = mockFetch();
    global.fetch = fetchMock;

    render(
      <LocaleProvider initialLocale="en">
        <Home />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Bot').length).toBeGreaterThan(0);
    });

    const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
    const batchCalls = calls.filter(
      ([url, init]) => url === '/api/launchd/statuses' && init?.method === 'POST',
    );
    expect(batchCalls).toHaveLength(1);

    const legacyStatusCalls = calls.filter(([url, init]) => {
      if (url !== '/api/launchd' || init?.method !== 'POST') return false;
      try {
        return JSON.parse(init.body as string).action === 'status';
      } catch {
        return false;
      }
    });
    expect(legacyStatusCalls).toHaveLength(0);
  });

  it('renders agents list before the batch status fetch resolves', async () => {
    type StatusResolver = (value: unknown) => void;
    const statusDeferred: { resolve: StatusResolver | null } = { resolve: null };

    global.fetch = vi
      .fn()
      .mockImplementation(async (url: string, init?: { method?: string; body?: string }) => {
        const method = init?.method ?? 'GET';

        if (url === '/api/agents' && method === 'GET') {
          return {
            ok: true,
            json: async () =>
              mockAgents.map((agent) => ({
                ...agent,
                apiServerAvailable: false,
                apiServerPort: null,
              })),
          };
        }

        if (url === '/api/launchd/statuses' && method === 'POST') {
          const body = JSON.parse(init?.body as string);
          const requested = body.agents as string[];
          return new Promise((resolve) => {
            statusDeferred.resolve = () =>
              resolve({
                ok: true,
                json: async () => ({
                  statuses: requested.map((agentId) => ({
                    agent: agentId,
                    running: agentId === 'alpha11',
                    pid: null,
                    code: 0,
                    manager: 'launchd',
                  })),
                }),
              });
          });
        }

        if ((url as string).startsWith('/api/templates') && method === 'GET') {
          return { ok: true, json: async () => [] };
        }

        return { ok: true, json: async () => ({}) };
      });

    render(
      <LocaleProvider initialLocale="en">
        <Home />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Bot').length).toBeGreaterThan(0);
      expect(screen.getAllByText('beta222').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText(/checking/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('Running')).not.toBeInTheDocument();

    statusDeferred.resolve?.(null);

    await waitFor(() => {
      expect(screen.getAllByText('Running').length).toBeGreaterThan(0);
    });
  });

  it('keeps the agents list rendered when batch status fetch fails', async () => {
    global.fetch = mockFetch({ batchStatusFail: true });

    render(
      <LocaleProvider initialLocale="en">
        <Home />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Bot').length).toBeGreaterThan(0);
      expect(screen.getAllByText('beta222').length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/unknown/i).length).toBeGreaterThan(0);
    });

    expect(screen.queryByText('Running')).not.toBeInTheDocument();
  });

  it('keeps the list rendered when some agents fail their status entry', async () => {
    global.fetch = vi
      .fn()
      .mockImplementation(async (url: string, init?: { method?: string; body?: string }) => {
        const method = init?.method ?? 'GET';
        if (url === '/api/agents' && method === 'GET') {
          return {
            ok: true,
            json: async () =>
              mockAgents.map((agent) => ({
                ...agent,
                apiServerAvailable: false,
                apiServerPort: null,
              })),
          };
        }
        if (url === '/api/launchd/statuses' && method === 'POST') {
          const body = JSON.parse(init?.body as string);
          const requested = body.agents as string[];
          return {
            ok: true,
            json: async () => ({
              statuses: requested.map((agentId) =>
                agentId === 'beta222'
                  ? {
                      agent: agentId,
                      running: null,
                      pid: null,
                      code: null,
                      manager: null,
                      error: 'Agent "beta222" not found',
                    }
                  : {
                      agent: agentId,
                      running: true,
                      pid: 7,
                      code: 0,
                      manager: 'launchd',
                    },
              ),
            }),
          };
        }
        if ((url as string).startsWith('/api/templates') && method === 'GET') {
          return { ok: true, json: async () => [] };
        }
        return { ok: true, json: async () => ({}) };
      });

    render(
      <LocaleProvider initialLocale="en">
        <Home />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Bot').length).toBeGreaterThan(0);
      expect(screen.getAllByText('beta222').length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Running').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/unknown/i).length).toBeGreaterThan(0);
    });
  });

  it('Add Agent dialog calls POST /api/agents and refreshes', async () => {
    const fetchMock = mockFetch();
    global.fetch = fetchMock;

    render(
      <LocaleProvider initialLocale="en">
        <Home />
      </LocaleProvider>,
    );

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
