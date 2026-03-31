import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useLaunchdAction } from '@/src/hooks/use-launchd-action';

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: toastMocks,
}));

afterEach(() => {
  vi.restoreAllMocks();
  toastMocks.success.mockReset();
  toastMocks.error.mockReset();
});

describe('useLaunchdAction', () => {
  it('start成功時にPOSTしてトースト表示しbusyを戻す', async () => {
    let resolveFetch:
      | ((value: { ok: boolean; json: () => Promise<Record<string, never>> }) => void)
      | null = null;
    const fetchMock = vi.fn(
      () =>
        new Promise<{ ok: boolean; json: () => Promise<Record<string, never>> }>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useLaunchdAction('agent-1', { onSuccess }));

    expect(result.current.isBusy).toBe(false);

    let executePromise!: Promise<boolean>;
    await act(async () => {
      executePromise = result.current.execute('start');
    });
    await waitFor(() => {
      expect(result.current.busyAction).toBe('start');
    });

    await act(async () => {
      resolveFetch?.({ ok: true, json: async () => ({}) });
      await executePromise;
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/launchd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: 'agent-1', action: 'start' }),
    });
    expect(toastMocks.success).toHaveBeenCalledWith('agent-1 started');
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.isBusy).toBe(false);
    expect(result.current.busyAction).toBeNull();
  });

  it('APIエラー時はerror優先でトースト表示しfalseを返す', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'permission denied', stderr: 'ignored stderr' }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useLaunchdAction('agent-2'));

    let ok = true;
    await act(async () => {
      ok = await result.current.execute('stop');
    });

    expect(ok).toBe(false);
    expect(toastMocks.error).toHaveBeenCalledWith('permission denied');
    expect(result.current.isBusy).toBe(false);
  });

  it('fallbackMessageを使ってネットワーク例外時のトーストを出す', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    const { result } = renderHook(() =>
      useLaunchdAction('agent-3', {
        fallbackMessage: (action) => `custom ${action} failed`,
      }),
    );

    await act(async () => {
      await result.current.execute('restart');
    });

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith('custom restart failed');
    });
    expect(result.current.busyAction).toBeNull();
  });
});
