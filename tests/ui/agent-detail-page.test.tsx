import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { Suspense } from 'react';
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

      if (url.startsWith('/api/env?agent=') && !url.includes('/resolved') && method === 'GET') {
        return {
          ok: true,
          json: async () => [{ key: 'API_KEY', value: '***', masked: true, visibility: 'secure' }],
        };
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
              agent: 'alpha',
              sourcePath: '/Users/tumf/.hermes/skills/coding',
              targetPath: '/runtime/agents/alpha/skills/coding',
              exists: true,
              relativePath: 'coding',
            },
          ],
        };
      }

      if (url === '/api/skills/tree' && method === 'GET') {
        return {
          ok: true,
          json: async () => ({
            tree: [
              {
                name: 'coding',
                relativePath: 'coding',
                hasSkill: true,
                children: [],
              },
            ],
          }),
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

    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <AgentDetailPage params={Promise.resolve({ id: 'alpha' })} />
        </Suspense>,
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Memory' })).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: 'Config' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Env' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Skills' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Logs' })).toBeInTheDocument();
  });

  it('shows both memory editors side by side', async () => {
    global.fetch = createFetchMock();

    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <AgentDetailPage params={Promise.resolve({ id: 'alpha' })} />
        </Suspense>,
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit AGENTS.md' })).toBeInTheDocument();
    });

    expect(screen.getByRole('textbox', { name: 'Edit SOUL.md' })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox').length).toBe(2);
  });

  it('loads both AGENTS.md and SOUL.md file content', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <AgentDetailPage params={Promise.resolve({ id: 'alpha' })} />
        </Suspense>,
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit AGENTS.md' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Edit SOUL.md' })).toBeInTheDocument();
    });

    const getCalls = (fetchMock.mock.calls as [string, { method?: string }?][]).filter(
      ([url, init]) => url.startsWith('/api/files?') && (init?.method ?? 'GET') === 'GET',
    );
    expect(getCalls.some(([url]) => url.includes('path=AGENTS.md'))).toBe(true);
    expect(getCalls.some(([url]) => url.includes('path=SOUL.md'))).toBe(true);
  });

  it('saves AGENTS.md when its Save button is clicked', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <AgentDetailPage params={Promise.resolve({ id: 'alpha' })} />
        </Suspense>,
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit AGENTS.md' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('textbox', { name: 'Edit AGENTS.md' }), {
      target: { value: '# updated agents\n' },
    });

    const saveButtons = screen.getAllByRole('button', { name: /Save/i });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      const putCalls = (
        fetchMock.mock.calls as [string, { method?: string; body?: string }?][]
      ).filter(([url, init]) => url === '/api/files' && init?.method === 'PUT');
      expect(putCalls.length).toBeGreaterThan(0);

      const lastPutBody = JSON.parse(putCalls[putCalls.length - 1][1]?.body ?? '{}');
      expect(lastPutBody.path).toBe('AGENTS.md');
      expect(lastPutBody.agent).toBe('alpha');
    });
  });

  it('renders Env and Skills tabs as clickable', async () => {
    global.fetch = createFetchMock();

    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <AgentDetailPage params={Promise.resolve({ id: 'alpha' })} />
        </Suspense>,
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Env' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Skills' })).toBeInTheDocument();
    });

    // Verify tabs are interactive (not disabled)
    const envTab = screen.getByRole('tab', { name: 'Env' });
    const skillsTab = screen.getByRole('tab', { name: 'Skills' });
    expect(envTab).not.toBeDisabled();
    expect(skillsTab).not.toBeDisabled();
  });
});
