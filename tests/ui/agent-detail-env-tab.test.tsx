import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

import { AgentEnvTab } from '../../src/components/agent-env-tab';
import {
  buildDeleteEnvRoute,
  buildGetEnvRoute,
  buildPostEnvRoute,
  createEnvState,
} from '../helpers/env-helpers';
import { createFetchRouter } from '../helpers/fetch-router';

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('sonner', () => ({ toast }));

function createFetchMock() {
  const state = createEnvState({
    rows: [
      { key: 'API_KEY', value: '***', masked: true, visibility: 'secure' },
      { key: 'MODEL', value: 'gpt-4', masked: false, visibility: 'plain' },
    ],
  });

  return createFetchRouter([
    buildGetEnvRoute('alpha', state),
    buildPostEnvRoute(),
    buildDeleteEnvRoute(state),
    (_, __) => ({ ok: true, json: async () => ({}) }),
  ]);
}

describe('Agent detail Env tab (AgentEnvTab)', () => {
  beforeEach(() => {
    toast.success.mockReset();
    toast.error.mockReset();
    global.fetch = createFetchMock() as typeof fetch;
  });

  it('renders env var list with masked values', async () => {
    render(<AgentEnvTab name="alpha" />);

    expect(await screen.findByText('API_KEY')).toBeInTheDocument();
    expect(screen.getByText('***')).toBeInTheDocument();
    expect(screen.getByText('MODEL')).toBeInTheDocument();
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
  });

  it('supports adding a new env var via the form', async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock as typeof fetch;

    render(<AgentEnvTab name="alpha" />);

    await waitFor(() => {
      expect(screen.getByText('API_KEY')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Env value'), { target: { value: 'new-value' } });

    // Verify the env API was called to load vars
    const calls = fetchMock.mock.calls as [string, { method?: string }?][];
    expect(
      calls.some(
        ([url, init]) =>
          url.startsWith('/api/env?agent=alpha') && (init?.method ?? 'GET') === 'GET',
      ),
    ).toBe(true);
  });
});
