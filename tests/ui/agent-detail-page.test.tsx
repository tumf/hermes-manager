import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { Suspense } from 'react';
import { toast } from 'sonner';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView = vi.fn();
  if (typeof (globalThis as { PointerEvent?: unknown }).PointerEvent === 'undefined') {
    (globalThis as { PointerEvent: unknown }).PointerEvent = class PointerEvent extends MouseEvent {
      pointerId: number;
      width: number;
      height: number;
      pressure: number;
      tangentialPressure: number;
      tiltX: number;
      tiltY: number;
      twist: number;
      pointerType: string;
      isPrimary: boolean;
      constructor(type: string, init?: PointerEventInit) {
        super(type, init);
        this.pointerId = init?.pointerId ?? 0;
        this.width = init?.width ?? 0;
        this.height = init?.height ?? 0;
        this.pressure = init?.pressure ?? 0;
        this.tangentialPressure = init?.tangentialPressure ?? 0;
        this.tiltX = init?.tiltX ?? 0;
        this.tiltY = init?.tiltY ?? 0;
        this.twist = init?.twist ?? 0;
        this.pointerType = init?.pointerType ?? '';
        this.isPrimary = init?.isPrimary ?? false;
      }
    };
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
});

import { buildAgentDetailRoutes } from '../helpers/agent-detail-fixtures';
import { createFetchRouter } from '../helpers/fetch-router';
import { LocaleProvider } from '@/src/components/locale-provider';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/src/components/code-editor', () => {
  const CodeEditor = React.forwardRef(function MockCodeEditor(
    {
      value,
      onChange,
      ariaLabel,
      readOnly,
    }: {
      value: string;
      onChange: (v: string) => void;
      ariaLabel?: string;
      filePath?: string;
      className?: string;
      readOnly?: boolean;
    },
    ref: React.ForwardedRef<{ insertTextAtSelection: (text: string) => void }>,
  ) {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    React.useImperativeHandle(
      ref,
      () => ({
        insertTextAtSelection: (text: string) => {
          if (readOnly) return;
          const textarea = textareaRef.current;
          if (!textarea) return;
          const start = textarea.selectionStart ?? value.length;
          const end = textarea.selectionEnd ?? value.length;
          const nextValue = `${value.slice(0, start)}${text}${value.slice(end)}`;
          onChange(nextValue);
        },
      }),
      [onChange, readOnly, value],
    );

    return React.createElement('textarea', {
      ref: textareaRef,
      value,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
      'aria-label': ariaLabel,
      readOnly,
    });
  });

  return { CodeEditor };
});

let AgentDetailPage: React.ComponentType<{ params: Promise<{ id: string }> }>;

function renderPage(name: string) {
  return render(
    <LocaleProvider initialLocale="en">
      <Suspense fallback={<div>Loading...</div>}>
        <AgentDetailPage params={Promise.resolve({ id: name })} />
      </Suspense>
    </LocaleProvider>,
  );
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

describe('Agent detail page', () => {
  it('shows Hermes version in header info area', async () => {
    global.fetch = createFetchRouter(buildAgentDetailRoutes({ hermesVersion: 'hermes 1.2.3' }));

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByText('Hermes: hermes 1.2.3')).toBeInTheDocument();
    });
  });

  it('shows Hermes fallback when version is unavailable', async () => {
    global.fetch = createFetchRouter(buildAgentDetailRoutes({ hermesVersion: null }));

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByText('Hermes: --')).toBeInTheDocument();
    });
  });

  it('shows MCP tab and loads only MCP fragment', async () => {
    global.fetch = createFetchRouter(
      buildAgentDetailRoutes({
        mcpContent: ['github:', '  command: npx', '  args:', '    - -y'].join('\n'),
      }),
    );
    window.history.replaceState(null, '', '#mcp');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'MCP' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Edit MCP servers YAML' })).toBeInTheDocument();
    });

    const calls = (global.fetch as ReturnType<typeof createFetchRouter>).mock.calls as [
      string,
      { method?: string; body?: string }?,
    ][];
    expect(
      calls.some(
        ([url, init]) => url === '/api/agents/alpha/mcp' && (init?.method ?? 'GET') === 'GET',
      ),
    ).toBe(true);
    expect(screen.queryByDisplayValue(/name: alpha/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Hermes MCP Guide' })).toHaveAttribute(
      'href',
      'https://hermes-agent.nousresearch.com/docs/guides/use-mcp-with-hermes',
    );
  });

  it('saves MCP fragment through dedicated API', async () => {
    const fetchMock = createFetchRouter(
      buildAgentDetailRoutes({ mcpContent: 'github:\n  command: npx' }),
    );
    global.fetch = fetchMock;
    window.history.replaceState(null, '', '#mcp');

    await act(async () => {
      renderPage('alpha');
    });

    const editor = (await screen.findByRole('textbox', {
      name: 'Edit MCP servers YAML',
    })) as HTMLTextAreaElement;
    fireEvent.change(editor, {
      target: { value: 'github:\n  command: uvx\n  args:\n    - mcp-server-git' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
      const putCall = calls.find(
        ([url, init]) => url === '/api/agents/alpha/mcp' && init?.method === 'PUT',
      );
      expect(putCall).toBeDefined();
      expect(JSON.parse(putCall?.[1]?.body ?? '{}')).toEqual({
        content: 'github:\n  command: uvx\n  args:\n    - mcp-server-git',
      });
    });

    expect(toast.success).toHaveBeenCalledWith('MCP config saved');
  });

  it('shows MCP save error from API response', async () => {
    global.fetch = createFetchRouter(
      buildAgentDetailRoutes({
        onMcpPut: () => ({ ok: false, json: async () => ({ error: 'Invalid YAML: broken' }) }),
      }),
    );
    window.history.replaceState(null, '', '#mcp');

    await act(async () => {
      renderPage('alpha');
    });

    const editor = (await screen.findByRole('textbox', {
      name: 'Edit MCP servers YAML',
    })) as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: 'broken' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid YAML: broken');
    });
  });

  it('MCP tab applies a saved template into the editor', async () => {
    global.fetch = createFetchRouter(
      buildAgentDetailRoutes({
        mcpContent: '',
        mcpTemplates: [{ name: 'github-default', content: 'github:\n  command: npx\n' }],
      }),
    );
    window.history.replaceState(null, '', '#mcp');

    await act(async () => {
      renderPage('alpha');
    });

    const editor = (await screen.findByRole('textbox', {
      name: 'Edit MCP servers YAML',
    })) as HTMLTextAreaElement;
    expect(editor.value).toBe('');

    const combo = await screen.findByRole('combobox', { name: /mcp templates/i });
    fireEvent.keyDown(combo, { key: 'Enter' });
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'github-default' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: 'github-default' }));

    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }));

    await waitFor(() => {
      expect(editor.value).toBe('github:\n  command: npx\n');
    });
    expect(toast.success).toHaveBeenCalledWith('Applied MCP template "github-default"');
  });

  it('MCP tab can save current fragment as a named template', async () => {
    const postBodies: { name: string; content: string }[] = [];
    const fetchMock = createFetchRouter(
      buildAgentDetailRoutes({
        mcpContent: 'github:\n  command: npx\n',
        mcpTemplates: [],
        onMcpTemplatePost: (body) => {
          postBodies.push(body);
          return { ok: true, json: async () => ({ name: body.name, content: body.content }) };
        },
      }),
    );
    global.fetch = fetchMock;
    window.history.replaceState(null, '', '#mcp');

    await act(async () => {
      renderPage('alpha');
    });

    await screen.findByRole('textbox', { name: 'Edit MCP servers YAML' });
    fireEvent.click(screen.getByRole('button', { name: /save as template/i }));

    const nameInput = (await screen.findByLabelText(/template name/i)) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'github-default' } });

    const dialogSave = screen
      .getAllByRole('button', { name: /^save$/i })
      .find((button) => button.getAttribute('type') === 'submit');
    expect(dialogSave).toBeDefined();
    if (dialogSave) fireEvent.click(dialogSave);

    await waitFor(() => {
      expect(postBodies).toHaveLength(1);
      expect(postBodies[0]).toEqual({
        name: 'github-default',
        content: 'github:\n  command: npx\n',
      });
    });
    expect(toast.success).toHaveBeenCalledWith('Saved MCP template "github-default"');
  });

  it('MCP tab can delete a saved template', async () => {
    const deletedNames: string[] = [];
    const fetchMock = createFetchRouter(
      buildAgentDetailRoutes({
        mcpContent: '',
        mcpTemplates: [{ name: 'github-default', content: 'github:\n  command: npx\n' }],
        onMcpTemplateDelete: (name) => {
          deletedNames.push(name);
          return { ok: true, json: async () => ({ ok: true }) };
        },
      }),
    );
    global.fetch = fetchMock;
    window.history.replaceState(null, '', '#mcp');

    await act(async () => {
      renderPage('alpha');
    });

    const combo = await screen.findByRole('combobox', { name: /mcp templates/i });
    fireEvent.keyDown(combo, { key: 'Enter' });
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'github-default' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: 'github-default' }));

    fireEvent.click(screen.getByRole('button', { name: /delete template/i }));

    const confirmButtons = await screen.findAllByRole('button', { name: /delete template/i });
    const confirm = confirmButtons[confirmButtons.length - 1];
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(deletedNames).toEqual(['github-default']);
    });
    expect(toast.success).toHaveBeenCalledWith('Deleted MCP template "github-default"');
  });

  it('shows legacy SOUL editor by default', async () => {
    global.fetch = createFetchRouter(buildAgentDetailRoutes({ partialModeEnabled: false }));
    window.history.replaceState(null, '', '#memory');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit SOUL.md' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Enable Partials/i })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Edit SOUL.src.md' })).not.toBeInTheDocument();
  });

  it('switches to SOUL.src.md editor in partial mode', async () => {
    global.fetch = createFetchRouter(buildAgentDetailRoutes({ partialModeEnabled: true }));
    window.history.replaceState(null, '', '#memory');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit SOUL.src.md' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Edit SOUL.md (assembled)' })).toBeInTheDocument();
    });
  });

  it('enable partials flow writes SOUL.src.md', async () => {
    const fetchMock = createFetchRouter(buildAgentDetailRoutes({ partialModeEnabled: false }));
    global.fetch = fetchMock;
    window.history.replaceState(null, '', '#memory');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enable Partials/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Enable Partials/i }));

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
      const putCall = calls.find(([url, init]) => {
        if (url !== '/api/files' || init?.method !== 'PUT' || !init.body) return false;
        const parsed = JSON.parse(init.body);
        return parsed.path === 'SOUL.src.md';
      });
      expect(putCall).toBeDefined();
    });

    expect(toast.success).toHaveBeenCalledWith('Partial mode enabled');
  });

  it('inserts partial reference at cursor position without forced newlines', async () => {
    global.fetch = createFetchRouter(buildAgentDetailRoutes({ partialModeEnabled: true }));
    window.history.replaceState(null, '', '#memory');

    await act(async () => {
      renderPage('alpha');
    });

    const editor = (await screen.findByRole('textbox', {
      name: 'Edit SOUL.src.md',
    })) as HTMLTextAreaElement;

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'directory-structure' })).toBeInTheDocument();
    });

    const cursor = '# Soul source\n\n'.length;
    editor.setSelectionRange(cursor, cursor);
    fireEvent.click(screen.getByRole('button', { name: 'directory-structure' }));

    expect(editor.value).toBe('# Soul source\n\n{{partial:directory-structure}}REPLACE_ME\n');
    expect(editor.value).not.toContain('# Soul source\n\n\n{{partial:');
    expect(editor.value).not.toContain('}}\n\nREPLACE_ME');
    expect(toast.success).toHaveBeenCalledWith('Inserted partial: directory-structure');
  });

  it('replaces selected text when inserting partial reference', async () => {
    global.fetch = createFetchRouter(buildAgentDetailRoutes({ partialModeEnabled: true }));
    window.history.replaceState(null, '', '#memory');

    await act(async () => {
      renderPage('alpha');
    });

    const editor = (await screen.findByRole('textbox', {
      name: 'Edit SOUL.src.md',
    })) as HTMLTextAreaElement;

    const selectedSnippet = 'REPLACE_ME';
    const start = editor.value.indexOf(selectedSnippet);
    expect(start).toBeGreaterThanOrEqual(0);
    const end = start + selectedSnippet.length;
    editor.setSelectionRange(start, end);

    fireEvent.click(screen.getByRole('button', { name: 'directory-structure' }));

    expect(editor.value).toBe('# Soul source\n\n{{partial:directory-structure}}\n');
    expect(toast.success).toHaveBeenCalledWith('Inserted partial: directory-structure');
  });

  it('hides shared partials already inserted in SOUL.src.md from the candidate list', async () => {
    global.fetch = createFetchRouter(
      buildAgentDetailRoutes({
        partialModeEnabled: true,
        soulSrcContent: '# Soul source\n\n{{partial:directory-structure}}\n',
      }),
    );
    window.history.replaceState(null, '', '#memory');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'security-rules' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'directory-structure' })).not.toBeInTheDocument();
  });

  it('removes a partial from the candidate list immediately after it is inserted', async () => {
    global.fetch = createFetchRouter(buildAgentDetailRoutes({ partialModeEnabled: true }));
    window.history.replaceState(null, '', '#memory');

    await act(async () => {
      renderPage('alpha');
    });

    const editor = (await screen.findByRole('textbox', {
      name: 'Edit SOUL.src.md',
    })) as HTMLTextAreaElement;

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'directory-structure' })).toBeInTheDocument();
    });

    const cursor = '# Soul source\n\n'.length;
    editor.setSelectionRange(cursor, cursor);
    fireEvent.click(screen.getByRole('button', { name: 'directory-structure' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'directory-structure' })).not.toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'security-rules' })).toBeInTheDocument();
  });

  it('shows empty-state message when every shared partial is already inserted', async () => {
    global.fetch = createFetchRouter(
      buildAgentDetailRoutes({
        partialModeEnabled: true,
        soulSrcContent:
          '# Soul source\n\n{{partial:directory-structure}}\n{{partial:security-rules}}\n',
      }),
    );
    window.history.replaceState(null, '', '#memory');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit SOUL.src.md' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'directory-structure' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'security-rules' })).not.toBeInTheDocument();
    expect(screen.getByText('No partials available.')).toBeInTheDocument();
  });

  it('keeps stable memory tab labels when switching between files', async () => {
    global.fetch = createFetchRouter(buildAgentDetailRoutes({ partialModeEnabled: true }));
    window.history.replaceState(null, '', '#memory');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'SOUL.src.md' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'memories/MEMORY.md' }));

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit memories/MEMORY.md' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'SOUL.src.md' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'memories/MEMORY.md' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'memories/USER.md' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'memories/USER.md' }));

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit memories/USER.md' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'SOUL.src.md' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'memories/MEMORY.md' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'memories/USER.md' })).toBeInTheDocument();
  });

  it('saves only currently selected memory file', async () => {
    const fetchMock = createFetchRouter(buildAgentDetailRoutes({ partialModeEnabled: true }));
    global.fetch = fetchMock;
    window.history.replaceState(null, '', '#memory');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit SOUL.src.md' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'memories/USER.md' }));

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit memories/USER.md' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('textbox', { name: 'Edit memories/USER.md' }), {
      target: { value: '# updated user\n' },
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]);

    await waitFor(() => {
      const putCalls = (
        fetchMock.mock.calls as [string, { method?: string; body?: string }?][]
      ).filter(([url, init]) => url === '/api/files' && init?.method === 'PUT');
      expect(putCalls.length).toBeGreaterThan(0);

      const lastPutBody = JSON.parse(putCalls[putCalls.length - 1][1]?.body ?? '{}');
      expect(lastPutBody.path).toBe('memories/USER.md');
      expect(lastPutBody.agent).toBe('alpha');
    });
  });

  it('hides Save button on assembled SOUL.md preview in partial mode', async () => {
    global.fetch = createFetchRouter(buildAgentDetailRoutes({ partialModeEnabled: true }));
    window.history.replaceState(null, '', '#memory');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit SOUL.src.md' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Edit SOUL.md (assembled)' })).toBeInTheDocument();
    });

    // The source editor should have a Save button
    const saveButtons = screen.getAllByRole('button', { name: /Save/i });
    // Only 1 Save button (from the source editor), not 2
    expect(saveButtons).toHaveLength(1);
  });

  it('refreshes assembled preview after successful SOUL.src.md save', async () => {
    const fetchMock = createFetchRouter(buildAgentDetailRoutes({ partialModeEnabled: true }));
    global.fetch = fetchMock;
    window.history.replaceState(null, '', '#memory');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit SOUL.src.md' })).toBeInTheDocument();
    });

    const assembledPreview = screen.getByRole('textbox', { name: 'Edit SOUL.md (assembled)' });
    expect(assembledPreview).toHaveValue('# Assembled Soul\n\n## Shared rules\n');

    // Edit SOUL.src.md
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit SOUL.src.md' }), {
      target: { value: '# Updated source\n' },
    });

    // Save
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    // After save, the assembled preview should remount with updated content
    await waitFor(() => {
      const updatedPreview = screen.getByRole('textbox', { name: 'Edit SOUL.md (assembled)' });
      expect(updatedPreview).toHaveValue('# Assembled from source\n\n# Updated source\n');
    });
  });

  it('does not refresh assembled preview when SOUL.src.md save fails', async () => {
    const fetchMock = createFetchRouter(
      buildAgentDetailRoutes({
        partialModeEnabled: true,
        onFilePut: (body) => {
          if (body.path === 'SOUL.src.md') {
            return {
              ok: false,
              json: async () => ({ error: 'Unknown partial reference: bad-partial' }),
            };
          }
          return undefined;
        },
      }),
    );
    global.fetch = fetchMock;
    window.history.replaceState(null, '', '#memory');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit SOUL.src.md' })).toBeInTheDocument();
    });

    const assembledPreview = screen.getByRole('textbox', { name: 'Edit SOUL.md (assembled)' });
    expect(assembledPreview).toHaveValue('# Assembled Soul\n\n## Shared rules\n');

    // Edit with invalid content
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit SOUL.src.md' }), {
      target: { value: '# Bad {{partial:bad-partial}}\n' },
    });

    // Attempt save
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save SOUL.src.md');
    });

    // Assembled preview should remain unchanged
    expect(screen.getByRole('textbox', { name: 'Edit SOUL.md (assembled)' })).toHaveValue(
      '# Assembled Soul\n\n## Shared rules\n',
    );
  });

  it('keeps the chat tab in a flex overflow-hidden container so the composer can stay pinned', async () => {
    global.fetch = createFetchRouter(
      buildAgentDetailRoutes({ apiServerStatus: 'disabled', partialModeEnabled: false }),
    );
    window.history.replaceState(null, '', '#chat');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(
        screen.getByText('To use Chat, you need to enable the api_server platform for this agent.'),
      ).toBeInTheDocument();
    });

    const tabsRoot = screen.getByRole('tablist').parentElement;
    expect(tabsRoot).toHaveClass('min-h-0', 'flex-1', 'overflow-hidden');

    const chatTabPanel = screen.getByRole('tabpanel');
    expect(chatTabPanel).toHaveClass('min-h-0', 'flex-1', 'overflow-hidden');

    expect(
      screen.getAllByText(
        (_, element) =>
          (element?.textContent ?? '').includes('config.yaml') &&
          (element?.textContent ?? '').includes('api_server'),
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/hermes gateway restart/)).toBeInTheDocument();
    expect(screen.queryByText(/API_SERVER_ENABLED=true/)).not.toBeInTheDocument();
  });

  it('shows meta port and gateway restart guidance when api_server status is error', async () => {
    global.fetch = createFetchRouter(
      buildAgentDetailRoutes({ apiServerStatus: 'error', partialModeEnabled: false }),
    );
    window.history.replaceState(null, '', '#chat');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByText('Could not connect to api_server.')).toBeInTheDocument();
    });

    expect(screen.getByText(/hermes gateway restart/)).toBeInTheDocument();
  });

  it('renders MCP tab and loads MCP fragment', async () => {
    const mcpYaml = 'filesystem:\n  command: npx\n';
    global.fetch = createFetchRouter(buildAgentDetailRoutes({ mcpContent: mcpYaml }));
    window.history.replaceState(null, '', '/agents/alpha#mcp');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      const editor = screen.getByRole('textbox', {
        name: 'Edit MCP servers YAML',
      }) as HTMLTextAreaElement;
      expect(editor.value).toBe(mcpYaml);
    });
  });

  it('saves MCP configuration via dedicated API', async () => {
    const fetchMock = createFetchRouter(
      buildAgentDetailRoutes({ mcpContent: 'old:\n  command: echo\n' }),
    );
    global.fetch = fetchMock;
    window.history.replaceState(null, '', '/agents/alpha#mcp');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit MCP servers YAML' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('textbox', { name: 'Edit MCP servers YAML' }), {
      target: { value: 'new:\n  command: test\n' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
      const putCall = calls.find(
        ([url, init]) => url === '/api/agents/alpha/mcp' && init?.method === 'PUT',
      );
      expect(putCall).toBeDefined();
      const body = JSON.parse(putCall![1]?.body ?? '{}');
      expect(body.content).toBe('new:\n  command: test\n');
    });

    expect(toast.success).toHaveBeenCalledWith('MCP config saved');
  });

  it('displays validation error when MCP save fails', async () => {
    const fetchMock = createFetchRouter(
      buildAgentDetailRoutes({
        mcpContent: '',
        onMcpPut: () => ({
          ok: false,
          json: async () => ({ error: 'Invalid YAML: unexpected end of stream' }),
        }),
      }),
    );
    global.fetch = fetchMock;
    window.history.replaceState(null, '', '/agents/alpha#mcp');

    await act(async () => {
      renderPage('alpha');
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Edit MCP servers YAML' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('textbox', { name: 'Edit MCP servers YAML' }), {
      target: { value: 'bad: yaml: content:\n' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid YAML: unexpected end of stream');
    });
  });

  it('uses a growable min-height-safe layout for the chat tab', async () => {
    global.fetch = createFetchRouter(buildAgentDetailRoutes({ partialModeEnabled: false }));
    window.history.replaceState(null, '', '#chat');

    await act(async () => {
      renderPage('alpha');
    });

    const chatLayout = await screen.findByTestId('chat-tab-layout');
    expect(chatLayout).toHaveClass('h-full');
    expect(chatLayout).toHaveClass('min-h-0');

    const chatPanel = chatLayout.closest('[role="tabpanel"]');
    expect(chatPanel).toHaveClass('flex-1');
    expect(chatPanel).toHaveClass('min-h-0');

    const pageRoot = chatPanel?.parentElement?.parentElement;
    expect(pageRoot).toHaveClass('overflow-hidden');
  });
});
