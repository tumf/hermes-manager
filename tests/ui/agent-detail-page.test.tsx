import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { Suspense } from 'react';
import { toast } from 'sonner';
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

function createFetchMock(
  apiServerStatus:
    | 'disabled'
    | 'configured-needs-restart'
    | 'starting'
    | 'connected'
    | 'error' = 'connected',
) {
  const apiServerAvailable = apiServerStatus === 'connected';

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

      if (url.includes('/api/agents/alpha') && method === 'GET' && !url.includes('/sessions')) {
        return {
          ok: true,
          json: async () => ({
            agentId: 'alpha',
            apiServerStatus,
            apiServerAvailable,
            apiServerPort: apiServerAvailable ? 19001 : null,
          }),
        };
      }

      if (url.includes('/sessions') && !url.includes('/messages') && method === 'GET') {
        return { ok: true, json: async () => [] };
      }

      if (url.includes('/messages') && method === 'GET') {
        return { ok: true, json: async () => [] };
      }

      if (url.includes('/chat') && method === 'POST') {
        return { ok: false, json: async () => ({ error: 'api_server not available' }) };
      }

      if (url.startsWith('/api/files?') && method === 'GET') {
        const query = new URLSearchParams(url.split('?')[1] ?? '');
        const path = query.get('path') ?? '';
        return { ok: true, json: async () => ({ content: fileContents[path] ?? '' }) };
      }

      if (url === '/api/files' && method === 'PUT') {
        return { ok: true, json: async () => ({}) };
      }

      if (url === '/api/agents' && method === 'GET') {
        return {
          ok: true,
          json: async () => [
            {
              agentId: 'alpha',
              name: 'alpha',
              description: 'test agent',
              tags: ['test'],
              home: '/runtime/agents/alpha',
            },
          ],
        };
      }

      if (url === '/api/agents/alpha/meta' && method === 'PUT') {
        const body = JSON.parse(init?.body ?? '{}');
        return {
          ok: true,
          json: async () => ({
            name: body.name ?? '',
            description: body.description ?? '',
            tags: body.tags ?? [],
          }),
        };
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

      if (url === '/api/agents' && method === 'GET') {
        return {
          ok: true,
          json: async () => [
            {
              agentId: 'alpha',
              name: 'Alpha Agent',
              description: 'test agent',
              tags: ['test'],
              home: '/runtime/agents/alpha',
            },
          ],
        };
      }

      if (url === '/api/agents/alpha/meta' && method === 'PUT') {
        const body = JSON.parse(init?.body ?? '{}');
        return {
          ok: true,
          json: async () => ({
            name: body.name ?? '',
            description: body.description ?? '',
            tags: body.tags ?? [],
          }),
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
  window.history.replaceState(null, '', '/agents/alpha');
  const mod = await import('../../app/agents/[id]/page');
  AgentDetailPage = mod.default;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Agent detail memory tab', () => {
  it('Start操作でlaunchd API呼び出しと成功トーストを表示する', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
      const call = calls.find(
        ([url, init]) =>
          url === '/api/launchd' &&
          init?.method === 'POST' &&
          JSON.parse(init?.body ?? '{}').action === 'start',
      );
      expect(call).toBeDefined();
    });

    expect(toast.success).toHaveBeenCalledWith('alpha started');
  });

  it('Start操作失敗時にエラートーストを表示する', async () => {
    global.fetch = vi
      .fn()
      .mockImplementation(async (url: string, init?: { method?: string; body?: string }) => {
        const method = init?.method ?? 'GET';
        if (url === '/api/launchd' && method === 'POST') {
          const body = JSON.parse(init?.body ?? '{}');
          if (body.action === 'status') {
            return { ok: true, json: async () => ({ running: false }) };
          }
          if (body.action === 'start') {
            return { ok: false, json: async () => ({ stderr: 'launch failed' }) };
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
            json: async () => [
              { key: 'API_KEY', value: '***', masked: true, visibility: 'secure' },
            ],
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
              tree: [{ name: 'coding', relativePath: 'coding', hasSkill: true, children: [] }],
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
      }) as unknown as typeof fetch;

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('launch failed');
    });
  });
  it('renders required tabs including Metadata, Memory, Env and Skills', async () => {
    global.fetch = createFetchMock();

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Metadata' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Memory' })).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: 'Config' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Env' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Skills' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cron' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Chat' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Logs' })).toBeInTheDocument();
  });

  it('shows single memory file editor (AGENTS.md by default) after opening Memory tab', async () => {
    global.fetch = createFetchMock();
    window.history.replaceState(null, '', '#memory');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit AGENTS.md' })).toBeInTheDocument();
    });

    // Single file view: only one editor visible at a time
    expect(screen.queryByRole('textbox', { name: 'Edit SOUL.md' })).not.toBeInTheDocument();
  });

  it('loads AGENTS.md file content by default after opening Memory tab', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;
    window.history.replaceState(null, '', '#memory');

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
    window.history.replaceState(null, '', '#memory');

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
    window.history.replaceState(null, '', '#memory');

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

  it('shows toast after start action', async () => {
    global.fetch = createFetchMock();

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('alpha started');
    });
  });

  it('shows metadata as read-only in header and hides empty fields', async () => {
    global.fetch = createFetchMock();

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /alpha/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /alpha/i }).closest('div')).toHaveTextContent(
        'test agent',
      );
      expect(screen.getByText('test')).toBeInTheDocument();
    });
  });

  it('Chat タブで configured-needs-restart ガイダンスを表示する', async () => {
    global.fetch = createFetchMock('configured-needs-restart');
    window.history.replaceState(null, '', '#chat');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByText(/gateway を再起動/)).toBeInTheDocument();
    });
  });

  it('Chat タブで starting ガイダンスを表示する', async () => {
    global.fetch = createFetchMock('starting');
    window.history.replaceState(null, '', '#chat');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByText(/接続準備中/)).toBeInTheDocument();
    });
  });

  it('saves metadata and shows success toast', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Display Name')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Display Name'), {
      target: { value: 'Alpha Agent' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Metadata' }));

    await waitFor(() => {
      const putMetaCalls = (fetchMock.mock.calls as [string, { method?: string }?][]).filter(
        ([url, init]) =>
          url === '/api/agents/alpha/meta' && (init?.method ?? '').toUpperCase() === 'PUT',
      );
      expect(putMetaCalls.length).toBeGreaterThan(0);
      expect(toast.success).toHaveBeenCalledWith('Agent metadata updated');
    });

    await waitFor(() => {
      expect(screen.getByText('Alpha Agent')).toBeInTheDocument();
    });
  });
});
