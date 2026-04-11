import { Loader2, Play, RotateCcw, Square } from 'lucide-react';

import { useLocale } from '@/src/components/locale-provider';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';

import { type AgentStatus } from '@/src/hooks/use-agent-status';

interface AgentStatusHeaderProps {
  statusLoading: boolean;
  status: AgentStatus | null;
  actionBusy: 'start' | 'stop' | 'restart' | null;
  onAction: (action: 'start' | 'stop' | 'restart') => void;
}

export function AgentStatusHeader({
  statusLoading,
  status,
  actionBusy,
  onAction,
}: AgentStatusHeaderProps) {
  const { t } = useLocale();
  const running = Boolean(status?.running);

  if (statusLoading) {
    return <div className="h-9 w-24 animate-pulse rounded-md bg-muted" aria-hidden="true" />;
  }

  return (
    <div className="flex items-center gap-3">
      <Badge variant={actionBusy ? 'outline' : running ? 'success' : 'muted'}>
        {actionBusy ? (
          <Loader2 className="mr-1.5 size-3 animate-spin" />
        ) : (
          <span
            className={`mr-1.5 inline-block size-1.5 rounded-full ${running ? 'bg-green-600 dark:bg-green-400' : 'bg-muted-foreground/50'}`}
          />
        )}
        {actionBusy === 'start'
          ? t.agentStatus.starting
          : actionBusy === 'stop'
            ? t.agentStatus.stopping
            : actionBusy === 'restart'
              ? t.agentStatus.restarting
              : running
                ? t.agentStatus.running
                : t.agentStatus.stopped}
      </Badge>

      {running ? (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction('stop')}
            disabled={actionBusy !== null}
          >
            {actionBusy === 'stop' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Square className="size-3.5" />
            )}
            {t.agentStatus.stop}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction('restart')}
            disabled={actionBusy !== null}
          >
            {actionBusy === 'restart' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RotateCcw className="size-3.5" />
            )}
            {t.agentStatus.restart}
          </Button>
        </>
      ) : (
        <Button size="sm" onClick={() => onAction('start')} disabled={actionBusy !== null}>
          {actionBusy === 'start' ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3.5" />
          )}
          {t.agentStatus.start}
        </Button>
      )}
    </div>
  );
}
