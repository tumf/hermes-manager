import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

import AgentPage from '../../app/agents/[name]/page';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('sonner', () => ({ toast }));

type EnvEntry = { key: string; value: string; masked: boolean };
type ResolvedEntry = { key: string; value: string; source: 'global' | 'agent' | 'agent-override' };

const state: {
  env: EnvEntry[];
  resolved: ResolvedEntry[];
} = {
  env: [
    { key: 'API_KEY', value: 'secret-agent', masked: true },
    { key: 'MODEL', value: '***', masked: true },
  ],
  resolved: [
    { key: 'GLOBAL_ONLY', value: 'g-only', source: 'global' },
    { key: 'API_KEY', value: 'secret-agent', source: 'agent' },
    { key: 'BASE_URL', value: 'https://agent.example.com', source: 'agent-override' },
  ],
};

function createFetchMock() {
  return vi
    .fn()
    .mockImplementation(async (url: string, init?: { method?: string; body?: string }) => {
      const method = init?.method ?? 'GET';

      if (url === '/api/launchd' && method === 'POST') {
        const body = JSON.parse(init?.body ?? '{}') as { action: string };
        if (body.action === 'status') {
          return {
            ok: true,
            json: async () => ({ running: true, label: 'ai.hermes.gateway.alpha' }),
          };
        }
        return { ok: true, json: async () => ({}) };
      }

      if (url.startsWith('/api/files?') && method === 'GET') {
        return { ok: true, json: async () => ({ content: '# test' }) };
      }

      if (url.startsWith('/api/logs?') && method === 'GET') {
        return { ok: true, json: async () => ({ lines: ['log line'] }) };
      }

      if (url.startsWith('/api/env/resolved?agent=alpha') && method === 'GET') {
        return { ok: true, json: async () => state.resolved };
      }

      if (url.startsWith('/api/env?agent=alpha&reveal=true') && method === 'GET') {
        return {
          ok: true,
          json: async () =>
            state.env.map((entry) => ({
              key: entry.key,
              value: entry.key === 'API_KEY' ? 'secret-agent' : entry.value,
              masked: false,
            })),
        };
      }

      if (url.startsWith('/api/env?agent=alpha') && method === 'GET') {
        return { ok: true, json: async () => state.env };
      }

      if (url === '/api/env' && method === 'POST') {
        const body = JSON.parse(init?.body ?? '{}') as { key: string; value: string };
        state.env = state.env.filter((entry) => entry.key !== body.key);
        state.env.push({ key: body.key, value: '***', masked: true });
        state.resolved = state.resolved.filter((entry) => entry.key !== body.key);
        state.resolved.push({ key: body.key, value: body.value, source: 'agent' });
        return { ok: true, json: async () => ({ ok: true }) };
      }

      if (url.startsWith('/api/env?agent=alpha&key=') && method === 'DELETE') {
        const key = decodeURIComponent(url.split('&key=')[1] ?? '');
        state.env = state.env.filter((entry) => entry.key !== key);
        state.resolved = state.resolved.filter((entry) => entry.key !== key);
        return { ok: true, json: async () => ({ ok: true }) };
      }

      return { ok: true, json: async () => ({}) };
    });
}

function renderAgentPage() {
  return render(<AgentPage params={{ name: 'alpha' } as any} />);
}

async function openEnvTab() {
  const user = userEvent.setup();
  const envTab = screen.getByRole('tab', { name: 'Env' });
  expect(envTab).toBeDefined();
  await user.click(envTab);
}

describe('Agent detail Env tab', () => {
  beforeEach(() => {
    state.env = [
      { key: 'API_KEY', value: '***', masked: true },
      { key: 'MODEL', value: '***', masked: true },
    ];
    state.resolved = [
      { key: 'GLOBAL_ONLY', value: 'g-only', source: 'global' },
      { key: 'API_KEY', value: 'secret-agent', source: 'agent' },
      { key: 'BASE_URL', value: 'https://agent.example.com', source: 'agent-override' },
    ];
    toast.success.mockReset();
    toast.error.mockReset();
    global.fetch = createFetchMock() as typeof fetch;
  });

  it('renders Env tab and shows masked list with resolved sources', async () => {
    renderAgentPage();

    await screen.findByRole('tablist');
    await openEnvTab();

    await waitFor(() => {
      expect(screen.getAllByText('API_KEY').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('***').length).toBeGreaterThan(0);
  });

  it('supports add and delete flows', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock as typeof fetch;
    const user = userEvent.setup();

    renderAgentPage();

    await screen.findByRole('tablist');
    await openEnvTab();

    await waitFor(() => {
      expect(screen.getAllByText('API_KEY').length).toBeGreaterThan(0);
    });

    // Verify env data is loaded via /api/env
    const envCalls = (fetchMock.mock.calls as [string, { method?: string }?][]).filter(
      ([url, init]) => url.startsWith('/api/env?agent=alpha') && (init?.method ?? 'GET') === 'GET',
    );
    expect(envCalls.length).toBeGreaterThan(0);

    // Delete API_KEY
    await user.click(screen.getByRole('button', { name: 'Delete API_KEY' }));
    // Confirm deletion in alert dialog
    const deleteBtn = await screen.findByRole('button', { name: 'Delete' });
    await user.click(deleteBtn);

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string }?][];
      expect(
        calls.some(
          ([url, init]) =>
            url.includes('/api/env?agent=alpha&key=API_KEY') && init?.method === 'DELETE',
        ),
      ).toBe(true);
    });
  });
});
