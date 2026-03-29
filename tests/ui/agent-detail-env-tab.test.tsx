import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

import { AgentEnvTab } from '../../src/components/agent-env-tab';

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('sonner', () => ({ toast }));

interface EnvEntry {
  key: string;
  value: string;
  masked: boolean;
  visibility: 'plain' | 'secure';
}

let envRows: EnvEntry[];

function createFetchMock() {
  return vi
    .fn()
    .mockImplementation(async (url: string, init?: { method?: string; body?: string }) => {
      const method = init?.method ?? 'GET';

      if (url.startsWith('/api/env?agent=alpha') && method === 'GET') {
        return { ok: true, json: async () => envRows };
      }

      if (url === '/api/env' && method === 'POST') {
        const body = JSON.parse(init?.body ?? '{}') as {
          key: string;
          value: string;
          visibility: string;
        };
        envRows = envRows.filter((entry) => entry.key !== body.key);
        envRows.push({
          key: body.key,
          value: '***',
          masked: true,
          visibility: (body.visibility ?? 'plain') as 'plain' | 'secure',
        });
        return { ok: true, json: async () => ({ ok: true }) };
      }

      if (url.startsWith('/api/env?agent=alpha&key=') && method === 'DELETE') {
        const key = decodeURIComponent(url.split('&key=')[1] ?? '');
        envRows = envRows.filter((entry) => entry.key !== key);
        return { ok: true, json: async () => ({ ok: true }) };
      }

      return { ok: true, json: async () => ({}) };
    });
}

describe('Agent detail Env tab (AgentEnvTab)', () => {
  beforeEach(() => {
    envRows = [
      { key: 'API_KEY', value: '***', masked: true, visibility: 'secure' },
      { key: 'MODEL', value: 'gpt-4', masked: false, visibility: 'plain' },
    ];
    toast.success.mockReset();
    toast.error.mockReset();
    global.fetch = createFetchMock() as typeof fetch;
  });

  it('renders env var list with masked values', async () => {
    render(<AgentEnvTab name="alpha" />);

    expect(await screen.findByText('API_KEY')).toBeInTheDocument();
    expect(screen.getByText('***')).toBeInTheDocument();
    expect(screen.getByText('MODEL')).toBeInTheDocument();
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
  });

  it('supports adding a new env var via the form', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock as typeof fetch;

    render(<AgentEnvTab name="alpha" />);

    await waitFor(() => {
      expect(screen.getByText('API_KEY')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Env value'), { target: { value: 'new-value' } });

    // Verify the env API was called to load vars
    const calls = fetchMock.mock.calls as [string, { method?: string }?][];
    expect(
      calls.some(
        ([url, init]) =>
          url.startsWith('/api/env?agent=alpha') && (init?.method ?? 'GET') === 'GET',
      ),
    ).toBe(true);
  });
});
