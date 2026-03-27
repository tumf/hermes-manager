import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  return render(<AgentPage params={{ name: 'alpha' }} />);
}

function openEnvTab() {
  const tabs = screen.getAllByRole('tab');
  const envTab = tabs[2];
  expect(envTab).toBeDefined();
  fireEvent.click(envTab);
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
    openEnvTab();

    expect(await screen.findByText('Agent-local Environment Variables')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText('API_KEY').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('***').length).toBeGreaterThan(0);

    expect(screen.getAllByText('global').length).toBeGreaterThan(0);
    expect(screen.getAllByText('agent').length).toBeGreaterThan(0);
    expect(screen.getAllByText('agent-override').length).toBeGreaterThan(0);
  });

  it('supports reveal, add/update, and delete flows', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock as typeof fetch;

    renderAgentPage();

    await screen.findByRole('tablist');
    openEnvTab();

    fireEvent.click(screen.getByRole('button', { name: /reveal values/i }));

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string }?][];
      expect(
        calls.some(
          ([url, init]) =>
            url.includes('/api/env?agent=alpha&reveal=true') && (init?.method ?? 'GET') === 'GET',
        ),
      ).toBe(true);
    });

    fireEvent.change(screen.getByLabelText('Env key'), { target: { value: 'NEW_KEY' } });
    fireEvent.change(screen.getByLabelText('Env value'), { target: { value: 'new-value' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save env variable' }));

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
      const postCall = calls.find(
        ([url, init]) =>
          url === '/api/env' &&
          init?.method === 'POST' &&
          (init.body?.includes('"key":"NEW_KEY"') ?? false),
      );
      expect(postCall).toBeDefined();
    });

    await waitFor(() => {
      expect(screen.getAllByText('NEW_KEY').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete NEW_KEY' }));

    await waitFor(() => {
      expect(screen.queryByText('NEW_KEY')).not.toBeInTheDocument();
    });
  });
});
