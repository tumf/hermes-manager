import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface AgentStatus {
  running: boolean;
  label?: string;
  pid?: number | null;
}

type AgentAction = 'start' | 'stop' | 'restart';

interface UseAgentStatusResult {
  status: AgentStatus | null;
  loading: boolean;
  actionBusy: AgentAction | null;
  fetchStatus: () => Promise<void>;
  handleStartStop: (action: AgentAction) => Promise<void>;
}

export function useAgentStatus(agentId: string): UseAgentStatusResult {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<AgentAction | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/launchd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentId, action: 'status' }),
      });
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const handleStartStop = useCallback(
    async (action: AgentAction) => {
      setActionBusy(action);
      try {
        const res = await fetch('/api/launchd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: agentId, action }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message =
            typeof data.error === 'string'
              ? data.error
              : typeof data.stderr === 'string' && data.stderr.trim()
                ? data.stderr.trim()
                : `Failed to ${action}`;
          toast.error(message);
          return;
        }

        const labels: Record<AgentAction, string> = {
          start: 'started',
          stop: 'stopped',
          restart: 'restarted',
        };

        toast.success(`${agentId} ${labels[action]}`);
        await fetchStatus();
      } catch {
        toast.error(`Failed to ${action}`);
      } finally {
        setActionBusy(null);
      }
    },
    [agentId, fetchStatus],
  );

  return {
    status,
    loading,
    actionBusy,
    fetchStatus,
    handleStartStop,
  };
}
