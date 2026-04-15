import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { toast } from 'sonner';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

import { LocaleProvider } from '@/src/components/locale-provider';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/src/components/code-editor', () => ({
<<<<<<< Updated upstream
  CodeEditor: ({
    value,
    onChange,
    ariaLabel,
  }: {
    value: string;
    onChange: (value: string) => void;
    ariaLabel?: string;
  }) =>
=======
  CodeEditor: ({ value, onChange, ariaLabel }: { value: string; onChange: (value: string) => void; ariaLabel?: string }) =>
>>>>>>> Stashed changes
    React.createElement('textarea', {
      'aria-label': ariaLabel,
      value,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
    }),
}));

let PartialsPage: React.ComponentType;

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(async () => {
  const mod = await import('../../app/partials/page');
  PartialsPage = mod.default;
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

      if (url === '/api/partials' && method === 'GET') {
        return {
          ok: true,
          json: async () => [
            {
              name: 'shared-rules',
              content: '## Shared rules',
              usedBy: ['alpha'],
            },
            {
              name: 'unused',
              content: '## Unused',
              usedBy: [],
            },
          ],
        };
      }

      if (url === '/api/partials' && method === 'POST') {
        return { ok: true, json: async () => ({ name: 'new-partial' }) };
      }

      if (url === '/api/partials' && method === 'PUT') {
        return { ok: true, json: async () => ({ name: 'shared-rules' }) };
      }

      if (url.includes('/api/partials?name=shared-rules') && method === 'DELETE') {
        return {
          ok: false,
          status: 409,
          json: async () => ({ error: 'partial is in use', usedBy: ['alpha'] }),
        };
      }

      if (url.includes('/api/partials?name=unused') && method === 'DELETE') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
        };
      }

      return { ok: true, json: async () => ({}) };
    });
}

describe('PartialsPage', () => {
  it('renders partial list and usage badges', async () => {
    global.fetch = createFetchMock();

    render(
      <LocaleProvider initialLocale="en">
        <PartialsPage />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('shared-rules')).toBeInTheDocument();
      expect(screen.getByText('alpha')).toBeInTheDocument();
      expect(screen.getByText('unused', { selector: '.inline-flex' })).toBeInTheDocument();
    });
  });

  it('submits create partial form', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    render(
      <LocaleProvider initialLocale="en">
        <PartialsPage />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Partial/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /New Partial/i }));

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'new-partial' },
    });
    fireEvent.change(screen.getByLabelText('Content'), {
      target: { value: '# Content' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
      const createCall = calls.find(
        ([url, init]) => url === '/api/partials' && init?.method === 'POST',
      );
      expect(createCall).toBeDefined();
      expect(JSON.parse(createCall?.[1]?.body ?? '{}')).toEqual({
        name: 'new-partial',
        content: '# Content',
      });
    });
  });

  it('shows delete-blocked state when partial is used', async () => {
    global.fetch = createFetchMock();

    render(
      <LocaleProvider initialLocale="en">
        <PartialsPage />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Delete shared-rules')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Delete shared-rules'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Partial is in use by: alpha');
    });
  });

  it('shows editor status metadata in the dialog', async () => {
    global.fetch = createFetchMock();

<<<<<<< Updated upstream
    render(
      <LocaleProvider initialLocale="en">
        <PartialsPage />
      </LocaleProvider>,
    );
=======
    render(<PartialsPage />);
>>>>>>> Stashed changes

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Partial/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /New Partial/i }));
    fireEvent.change(screen.getByLabelText('Content'), {
      target: { value: 'line1\nline2' },
    });

    expect(screen.getByText('2 lines')).toBeInTheDocument();
    expect(screen.getByText('11 chars')).toBeInTheDocument();
  });

  it('shows unsaved state and saves with cmd-s', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

<<<<<<< Updated upstream
    render(
      <LocaleProvider initialLocale="en">
        <PartialsPage />
      </LocaleProvider>,
    );
=======
    render(<PartialsPage />);
>>>>>>> Stashed changes

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Partial/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /New Partial/i }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'new-partial' },
    });
    fireEvent.change(screen.getByLabelText('Content'), {
      target: { value: '# Content' },
    });

    expect(screen.getByText('unsaved')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 's', metaKey: true });

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
<<<<<<< Updated upstream
      const createCall = calls.find(
        ([url, init]) => url === '/api/partials' && init?.method === 'POST',
      );
=======
      const createCall = calls.find(([url, init]) => url === '/api/partials' && init?.method === 'POST');
>>>>>>> Stashed changes
      expect(createCall).toBeDefined();
    });
  });
});
