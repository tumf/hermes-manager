import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export type LaunchdAction = 'start' | 'stop' | 'restart';

type LaunchdErrorResponse = {
  error?: unknown;
  stderr?: unknown;
};

type UseLaunchdActionOptions = {
  onSuccess?: () => Promise<void> | void;
  fallbackMessage?: (action: LaunchdAction, agentId: string) => string;
};

const ACTION_LABELS: Record<LaunchdAction, string> = {
  start: 'started',
  stop: 'stopped',
  restart: 'restarted',
};

function resolveErrorMessage(
  data: LaunchdErrorResponse,
  action: LaunchdAction,
  agentId: string,
  fallbackMessage?: (action: LaunchdAction, agentId: string) => string,
): string {
  if (typeof data.error === 'string' && data.error.trim()) {
    return data.error;
  }
  if (typeof data.stderr === 'string' && data.stderr.trim()) {
    return data.stderr.trim();
  }
  return fallbackMessage?.(action, agentId) ?? `Failed to ${action} ${agentId}`;
}

export function useLaunchdAction(agentId: string, options?: UseLaunchdActionOptions) {
  const [busyAction, setBusyAction] = useState<LaunchdAction | null>(null);

  const execute = useCallback(
    async (action: LaunchdAction): Promise<boolean> => {
      setBusyAction(action);
      try {
        const response = await fetch('/api/launchd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: agentId, action }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as LaunchdErrorResponse;
          toast.error(resolveErrorMessage(data, action, agentId, options?.fallbackMessage));
          return false;
        }

        toast.success(`${agentId} ${ACTION_LABELS[action]}`);
        await options?.onSuccess?.();
        return true;
      } catch {
        toast.error(
          options?.fallbackMessage?.(action, agentId) ?? `Failed to ${action} ${agentId}`,
        );
        return false;
      } finally {
        setBusyAction(null);
      }
    },
    [agentId, options],
  );

  return {
    busyAction,
    isBusy: busyAction !== null,
    execute,
  };
}
