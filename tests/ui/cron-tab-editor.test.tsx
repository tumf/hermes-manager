import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

import { CronTab } from '../../src/components/cron-tab';
import { createFetchRouter, type FetchInit, jsonOk } from '../helpers/fetch-router';

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('sonner', () => ({ toast }));

const baseJob = {
  id: 'abc123',
  name: 'daily-summary',
  prompt: 'summarize my inbox',
  skills: ['skill-a'],
  schedule: { kind: 'cron', expr: '0 9 * * *', display: '0 9 * * *' },
  state: 'scheduled' as const,
  enabled: true,
  created_at: '2026-04-01T00:00:00Z',
  next_run_at: '2026-04-19T09:00:00Z',
  last_run_at: '2026-04-18T09:00:00Z',
  last_status: 'ok',
  last_error: null,
  deliver: 'telegram:1',
  repeat: { times: null, completed: 0 },
  model: 'claude-sonnet-4',
  provider: 'anthropic',
};

type PutResult = { ok: true; payload?: unknown } | { ok: false; payload: unknown };

function buildRouter(opts: { putResponse?: (body: unknown) => PutResult } = {}) {
  return createFetchRouter([
    (url, init) => {
      if (url.startsWith('/api/cron?agent=alpha') && (init?.method ?? 'GET') === 'GET') {
        return jsonOk({ jobs: [baseJob] });
      }
      return undefined;
    },
    (url, init) => {
      if (url === '/api/cron' && init?.method === 'PUT') {
        const body = init.body ? JSON.parse(init.body) : {};
        if (opts.putResponse) {
          const result = opts.putResponse(body);
          if (!result.ok) {
            return {
              ok: false,
              json: async () => result.payload,
            };
          }
          return jsonOk(result.payload ?? { ok: true });
        }
        return jsonOk({ ok: true });
      }
      return undefined;
    },
  ]);
}

describe('Cron tab job detail editor', () => {
  beforeEach(() => {
    toast.success.mockReset();
    toast.error.mockReset();
  });

  it('opens an existing job and shows runtime metadata + editable defaults', async () => {
    global.fetch = buildRouter() as unknown as typeof fetch;
    render(<CronTab name="alpha" />);

    fireEvent.click(await screen.findByRole('button', { name: /Open job daily-summary/i }));

    expect(await screen.findByText(/Edit Job: daily-summary/)).toBeInTheDocument();
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText('next_run_at')).toBeInTheDocument();
    expect(screen.getByText('last_status')).toBeInTheDocument();

    const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
    expect(nameInput.value).toBe('daily-summary');
    const scheduleInput = screen.getByLabelText(/Schedule/) as HTMLInputElement;
    expect(scheduleInput.value).toBe('0 9 * * *');
    const promptInput = screen.getByLabelText(/Prompt/) as HTMLTextAreaElement;
    expect(promptInput.value).toBe('summarize my inbox');
    const skillsInput = screen.getByLabelText(/Skills/) as HTMLInputElement;
    expect(skillsInput.value).toBe('skill-a');
    const modelInput = screen.getByLabelText('Model') as HTMLInputElement;
    expect(modelInput.value).toBe('claude-sonnet-4');
    const providerInput = screen.getByLabelText('Provider') as HTMLInputElement;
    expect(providerInput.value).toBe('anthropic');
  });

  it('saves edits via PUT /api/cron with editable fields plus agent and id, then refreshes job list', async () => {
    const fetchMock = buildRouter();
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<CronTab name="alpha" />);

    fireEvent.click(await screen.findByRole('button', { name: /Open job daily-summary/i }));

    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'renamed' } });
    fireEvent.change(screen.getByLabelText(/Schedule/), { target: { value: '0 10 * * *' } });
    fireEvent.change(screen.getByLabelText(/Prompt/), { target: { value: 'updated task' } });
    fireEvent.change(screen.getByLabelText(/Skills/), { target: { value: 'skill-b, skill-c' } });
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'claude-opus-4' } });
    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'anthropic' } });

    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Job saved'));

    const calls = fetchMock.mock.calls as [string, FetchInit | undefined][];
    const putCall = calls.find(([url, init]) => url === '/api/cron' && init?.method === 'PUT');
    expect(putCall).toBeTruthy();
    const body = JSON.parse(putCall![1]!.body!);
    expect(body).toMatchObject({
      agent: 'alpha',
      id: 'abc123',
      name: 'renamed',
      schedule: '0 10 * * *',
      prompt: 'updated task',
      skills: ['skill-b', 'skill-c'],
      model: 'claude-opus-4',
      provider: 'anthropic',
    });

    // Editor should close and the jobs list should be refetched (>= 2 GETs).
    const getCalls = calls.filter(
      ([url, init]) => url.startsWith('/api/cron?agent=alpha') && (init?.method ?? 'GET') === 'GET',
    );
    expect(getCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('shows API validation error inline without losing the editor', async () => {
    const fetchMock = buildRouter({
      putResponse: () => ({
        ok: false,
        payload: { error: 'Invalid schedule expression' },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<CronTab name="alpha" />);

    fireEvent.click(await screen.findByRole('button', { name: /Open job daily-summary/i }));
    fireEvent.change(await screen.findByLabelText(/Schedule/), {
      target: { value: 'bogus-schedule' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Invalid schedule expression')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Invalid schedule expression');
    // Editor should still be visible
    expect(screen.getByText(/Edit Job: daily-summary/)).toBeInTheDocument();
  });

  it('blocks submit and surfaces error when prompt is cleared', async () => {
    global.fetch = buildRouter() as unknown as typeof fetch;
    render(<CronTab name="alpha" />);

    fireEvent.click(await screen.findByRole('button', { name: /Open job daily-summary/i }));
    fireEvent.change(await screen.findByLabelText(/Prompt/), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Prompt is required')).toBeInTheDocument();
  });
});
