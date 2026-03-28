import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

let AgentEnvTab: React.ComponentType<{ name: string }>;

function mockFetch() {
  return vi.fn().mockImplementation(async (url: string, init?: { method?: string }) => {
    const method = init?.method ?? 'GET';

    if (url === '/api/env?agent=alpha' && method === 'GET') {
      return {
        ok: true,
        json: async () => [
          { key: 'API_KEY', value: '***', masked: true, visibility: 'secure' },
          {
            key: 'BASE_URL',
            value: 'https://example.com',
            masked: false,
            visibility: 'plain',
          },
        ],
      };
    }

    if (url === '/api/env' && method === 'POST') {
      return { ok: true, json: async () => ({ ok: true }) };
    }

    return { ok: true, json: async () => ({}) };
  });
}

beforeEach(async () => {
  const mod = await import('../../app/agents/[id]/page');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AgentEnvTab = (mod as any).AgentEnvTab;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AgentEnvTab', () => {
  it('renders masked secure value and keeps secure selected in edit dialog', async () => {
    global.fetch = mockFetch();

    render(<AgentEnvTab name="alpha" />);

    expect(await screen.findByText('API_KEY')).toBeInTheDocument();
    expect(screen.getByText('***')).toBeInTheDocument();
    expect(screen.getAllByText('secure').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /edit API_KEY/i }));

    const dialog = await screen.findByRole('dialog');
    const visibilitySelect = within(dialog).getByLabelText('Visibility') as HTMLSelectElement;
    expect(visibilitySelect.value).toBe('secure');
  });
});
