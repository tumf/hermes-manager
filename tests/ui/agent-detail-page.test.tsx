import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

let AgentDetailPage: React.ComponentType<{ params: Promise<{ id: string }> }>;

const fileContents: Record<string, string> = {
  'AGENTS.md': '# Agents file\n',
  'SOUL.md': '# Soul file\n',
  'config.yaml': 'name: alpha\n',
};

function createFetchMock() {
  return vi
    .fn()
    .mockImplementation(async (url: string, init?: { method?: string; body?: string }) => {
      const method = init?.method ?? 'GET';

      if (url === '/api/launchd' && method === 'POST') {
        const body = JSON.parse(init?.body ?? '{}');
        if (body.action === 'status') {
          return { ok: true, json: async () => ({ running: false }) };
        }
        return { ok: true, json: async () => ({}) };
      }

      if (url.startsWith('/api/files?') && method === 'GET') {
        const query = new URLSearchParams(url.split('?')[1] ?? '');
        const path = query.get('path') ?? '';
        return { ok: true, json: async () => ({ content: fileContents[path] ?? '' }) };
      }

      if (url === '/api/files' && method === 'PUT') {
        return { ok: true, json: async () => ({}) };
      }

      if (url.startsWith('/api/env/resolved?') && method === 'GET') {
        return {
          ok: true,
          json: async () => [{ key: 'BASE_URL', value: 'https://example.com', source: 'global' }],
        };
      }

      if (url.startsWith('/api/skills/links?') && method === 'GET') {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              sourcePath: '/Users/tumf/.hermes/skills/coding',
              targetPath: '/runtime/agents/alpha/skills/coding',
              exists: true,
            },
          ],
        };
      }

      return { ok: true, json: async () => ({}) };
    });
}

beforeEach(async () => {
  const mod = await import('../../app/agents/[id]/page');
  AgentDetailPage = mod.default;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Agent detail memory tab', () => {
  it('renders required tabs including Env and Skills', async () => {
    global.fetch = createFetchMock();

    render(<AgentDetailPage params={Promise.resolve({ id: 'alpha' })} />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Memory' })).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: 'Config' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Env' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Skills' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Logs' })).toBeInTheDocument();
  });

  it('shows only one memory editor at a time', async () => {
    global.fetch = createFetchMock();

    render(<AgentDetailPage params={Promise.resolve({ id: 'alpha' })} />);

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit AGENTS.md' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('textbox', { name: 'Edit SOUL.md' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('textbox').length).toBe(1);
  });

  it('switches memory file and loads selected file content', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    render(<AgentDetailPage params={Promise.resolve({ id: 'alpha' })} />);

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit AGENTS.md' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'SOUL.md' }));

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit SOUL.md' })).toBeInTheDocument();
    });

    const getCalls = (fetchMock.mock.calls as [string, { method?: string }?][]).filter(
      ([url, init]) => url.startsWith('/api/files?') && (init?.method ?? 'GET') === 'GET',
    );
    expect(getCalls.some(([url]) => url.includes('path=SOUL.md'))).toBe(true);
  });

  it('asks confirmation before switching when unsaved changes exist', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<AgentDetailPage params={Promise.resolve({ id: 'alpha' })} />);

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit AGENTS.md' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('textbox', { name: 'Edit AGENTS.md' }), {
      target: { value: '# updated agents\n' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'SOUL.md' }));

    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('textbox', { name: 'Edit SOUL.md' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Edit AGENTS.md' })).toBeInTheDocument();

    const getCalls = (fetchMock.mock.calls as [string, { method?: string }?][]).filter(
      ([url, init]) => url.startsWith('/api/files?') && (init?.method ?? 'GET') === 'GET',
    );
    expect(getCalls.some(([url]) => url.includes('path=SOUL.md'))).toBe(false);
  });

  it('saves only currently selected memory file', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    render(<AgentDetailPage params={Promise.resolve({ id: 'alpha' })} />);

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit AGENTS.md' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'SOUL.md' }));

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit SOUL.md' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('textbox', { name: 'Edit SOUL.md' }), {
      target: { value: '# updated soul\n' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      const putCalls = (
        fetchMock.mock.calls as [string, { method?: string; body?: string }?][]
      ).filter(([url, init]) => url === '/api/files' && init?.method === 'PUT');
      expect(putCalls.length).toBeGreaterThan(0);

      const lastPutBody = JSON.parse(putCalls[putCalls.length - 1][1]?.body ?? '{}');
      expect(lastPutBody.path).toBe('SOUL.md');
      expect(lastPutBody.agent).toBe('alpha');
    });
  });

  it('loads resolved env when Env tab is opened', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    render(<AgentDetailPage params={Promise.resolve({ id: 'alpha' })} />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Env' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Env' }));

    await waitFor(() => {
      expect(screen.getByText('BASE_URL')).toBeInTheDocument();
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
    });

    const envCall = (fetchMock.mock.calls as [string, { method?: string }?][]).find(
      ([url, init]) =>
        url.startsWith('/api/env/resolved?') &&
        (init?.method ?? 'GET') === 'GET' &&
        url.includes('agent=alpha'),
    );
    expect(envCall).toBeDefined();
  });

  it('loads skill links when Skills tab is opened', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    render(<AgentDetailPage params={Promise.resolve({ id: 'alpha' })} />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Skills' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Skills' }));

    await waitFor(() => {
      expect(screen.getByText('/Users/tumf/.hermes/skills/coding')).toBeInTheDocument();
      expect(screen.getByText('/runtime/agents/alpha/skills/coding')).toBeInTheDocument();
      expect(screen.getByText('Linked')).toBeInTheDocument();
    });

    const linksCall = (fetchMock.mock.calls as [string, { method?: string }?][]).find(
      ([url, init]) =>
        url.startsWith('/api/skills/links?') &&
        (init?.method ?? 'GET') === 'GET' &&
        url.includes('agent=alpha'),
    );
    expect(linksCall).toBeDefined();
  });
});
