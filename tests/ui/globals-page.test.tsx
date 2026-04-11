import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

import { LocaleProvider } from '@/src/components/locale-provider';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

let GlobalsPage: React.ComponentType;

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(async () => {
  const mod = await import('../../app/globals/page');
  GlobalsPage = mod.default;
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

      if (url === '/api/globals' && method === 'GET') {
        return { ok: true, json: async () => [] };
      }

      if (url === '/api/globals' && method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            key: 'OPENROUTER_API_KEY_CUSTOM',
            value: 'secret-value',
            visibility: 'secure',
          }),
        };
      }

      return { ok: true, json: async () => ({}) };
    });
}

describe('GlobalsPage', () => {
  it('uses EnvKeyCombobox suggestions and submits free-form keys', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    render(
      <LocaleProvider initialLocale="en">
        <GlobalsPage />
      </LocaleProvider>,
    );

    const keyCombobox = await screen.findByRole('combobox', { name: /env key/i });
    expect(keyCombobox).toHaveTextContent('KEY_NAME');

    fireEvent.click(keyCombobox);
    expect(await screen.findByText('LLM Provider')).toBeInTheDocument();
    expect(screen.getByText('Tool API Keys')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('Search keys...');
    fireEvent.change(searchInput, { target: { value: 'OPENROUTER_API_KEY_CUSTOM' } });

    const freeInputOption = await screen.findByText('Use “OPENROUTER_API_KEY_CUSTOM”');
    fireEvent.click(freeInputOption);

    expect(await screen.findByRole('combobox', { name: /env key/i })).toHaveTextContent(
      'OPENROUTER_API_KEY_CUSTOM',
    );

    fireEvent.change(screen.getByLabelText('Variable value'), {
      target: { value: 'secret-value' },
    });
    fireEvent.change(screen.getByLabelText('Visibility'), {
      target: { value: 'secure' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      const calls = fetchMock.mock.calls as [string, { method?: string; body?: string }?][];
      const saveCall = calls.find(
        ([url, init]) => url === '/api/globals' && init?.method === 'POST',
      );
      expect(saveCall).toBeDefined();
      expect(JSON.parse(saveCall?.[1]?.body ?? '{}')).toEqual({
        key: 'OPENROUTER_API_KEY_CUSTOM',
        value: 'secret-value',
        visibility: 'secure',
      });
    });
  });
});
