import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { toast } from 'sonner';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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

    render(<PartialsPage />);

    await waitFor(() => {
      expect(screen.getByText('shared-rules')).toBeInTheDocument();
      expect(screen.getByText('alpha')).toBeInTheDocument();
      expect(screen.getByText('unused', { selector: '.inline-flex' })).toBeInTheDocument();
    });
  });

  it('submits create partial form', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    render(<PartialsPage />);

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

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

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

    render(<PartialsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Delete shared-rules')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Delete shared-rules'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Partial is in use by: alpha');
    });
  });
});
