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

vi.mock('@/src/components/code-editor', () => ({
  CodeEditor: ({
    value,
    onChange,
    ariaLabel,
  }: {
    value: string;
    onChange: (v: string) => void;
    ariaLabel?: string;
    filePath?: string;
    className?: string;
  }) =>
    React.createElement('textarea', {
      value,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
      'aria-label': ariaLabel,
    }),
}));

let AgentDetailPage: React.ComponentType<{ params: Promise<{ id: string }> }>;

function renderPage(name: string) {
  return render(
    <Suspense fallback={<div>Loading...</div>}>
      <AgentDetailPage params={Promise.resolve({ id: name })} />
    </Suspense>,
  );
}

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
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Memory' })).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: 'Config' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Env' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Skills' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Logs' })).toBeInTheDocument();
  });

  it('shows single memory file editor (AGENTS.md by default)', async () => {
    global.fetch = createFetchMock();

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit AGENTS.md' })).toBeInTheDocument();
    });

    // Single file view: only one editor visible at a time
    expect(screen.queryByRole('textbox', { name: 'Edit SOUL.md' })).not.toBeInTheDocument();
  });

  it('loads AGENTS.md file content by default', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit AGENTS.md' })).toBeInTheDocument();
    });

    const getCalls = (fetchMock.mock.calls as [string, { method?: string }?][]).filter(
      ([url, init]) => url.startsWith('/api/files?') && (init?.method ?? 'GET') === 'GET',
    );
    expect(getCalls.some(([url]) => url.includes('path=AGENTS.md'))).toBe(true);
  });

  it('blocks switching when dirty and user cancels', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit AGENTS.md' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('textbox', { name: 'Edit AGENTS.md' }), {
      target: { value: '# updated agents\n' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'SOUL.md' }));

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Keep Editing' }));

    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: 'Edit SOUL.md' })).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Edit AGENTS.md' })).toBeInTheDocument();
    });

    const getCalls = (fetchMock.mock.calls as [string, { method?: string }?][]).filter(
      ([url, init]) => url.startsWith('/api/files?') && (init?.method ?? 'GET') === 'GET',
    );
    expect(getCalls.some(([url]) => url.includes('path=SOUL.md'))).toBe(false);
  });

  it('saves only currently selected memory file', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    await act(async () => {
      renderPage('alpha');
    });

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

  it('renders Env and Skills tabs as clickable', async () => {
    global.fetch = createFetchMock();

    await act(async () => {
      renderPage('alpha');
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
