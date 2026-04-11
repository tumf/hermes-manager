import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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
    onChange: (value: string) => void;
    ariaLabel?: string;
  }) =>
    React.createElement('textarea', {
      'aria-label': ariaLabel,
      value,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
    }),
}));

let TemplatesPage: React.ComponentType;

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(async () => {
  const mod = await import('../../app/templates/page');
  TemplatesPage = mod.default;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function createFetchMock() {
  return vi
    .fn()
    .mockImplementation(async (url: string, init?: { method?: string; body?: string }) => {
      const method = init?.method ?? 'GET';

      if (url === '/api/templates' && method === 'GET') {
        return {
          ok: true,
          json: async () => [
            { name: 'default', files: ['AGENTS.md', 'SOUL.md'] },
            { name: 'ops', files: ['config.yaml'] },
          ],
        };
      }

      if (url.startsWith('/api/templates?name=') && method === 'GET') {
        return {
          ok: true,
          json: async () => ({ content: '# Existing template' }),
        };
      }

      if (url === '/api/templates' && method === 'POST') {
        return { ok: true, json: async () => ({ ok: true }) };
      }

      if (url === '/api/templates' && method === 'PUT') {
        return { ok: true, json: async () => ({ ok: true }) };
      }

      if (url.startsWith('/api/templates?name=') && method === 'DELETE') {
        return { ok: true, json: async () => ({ ok: true }) };
      }

      return { ok: true, json: async () => ({}) };
    });
}

describe('TemplatesPage', () => {
  it('renders template groups by file', async () => {
    global.fetch = createFetchMock();

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('AGENTS.md')).toBeInTheDocument();
      expect(screen.getByText('SOUL.md')).toBeInTheDocument();
      expect(screen.getByText('config.yaml')).toBeInTheDocument();
      expect(screen.getAllByText('default').length).toBeGreaterThan(0);
      expect(screen.getByText('ops')).toBeInTheDocument();
    });
  });

  it('submits create template form through top editor action', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Template File/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Add Template File/i }));

    fireEvent.change(screen.getByLabelText('Template Name'), {
      target: { value: 'team-default' },
    });
    fireEvent.change(screen.getByLabelText('Content'), {
      target: { value: '# Template body' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
      const createCall = calls.find(
        ([url, init]) => url === '/api/templates' && init?.method === 'POST',
      );
      expect(createCall).toBeDefined();
      expect(JSON.parse(createCall?.[1]?.body ?? '{}')).toEqual({
        file: 'AGENTS.md',
        name: 'team-default',
        content: '# Template body',
      });
    });
  });

  it('shows editor status metadata in the dialog', async () => {
    global.fetch = createFetchMock();

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Template File/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Add Template File/i }));
    fireEvent.change(screen.getByLabelText('Content'), {
      target: { value: 'line1\nline2' },
    });

    expect(screen.getByText('2 lines')).toBeInTheDocument();
    expect(screen.getByText('11 chars')).toBeInTheDocument();
  });

  it('shows unsaved state and saves with cmd-s', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Template File/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Add Template File/i }));
    fireEvent.change(screen.getByLabelText('Template Name'), {
      target: { value: 'team-default' },
    });
    fireEvent.change(screen.getByLabelText('Content'), {
      target: { value: '# Template body' },
    });

    expect(screen.getByText('unsaved')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 's', metaKey: true });

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
      const createCall = calls.find(
        ([url, init]) => url === '/api/templates' && init?.method === 'POST',
      );
      expect(createCall).toBeDefined();
    });
  });
});
