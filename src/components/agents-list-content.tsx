'use client';

import { Plus } from 'lucide-react';

import { AgentCard, type ActionType, type AgentWithStatus } from '@/src/components/agent-card';
import { useLocale } from '@/src/components/locale-provider';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Skeleton } from '@/src/components/ui/skeleton';

interface AgentsListContentProps {
  loading: boolean;
  statusLoading?: boolean;
  agents: AgentWithStatus[];
  busyMap: Record<string, ActionType>;
  onAction: (agent: AgentWithStatus, action: ActionType) => Promise<void>;
  onDelete: (agentId: string) => Promise<void>;
  onCopy: (fromId: string) => Promise<void>;
}

export function AgentsListContent({
  loading,
  statusLoading = false,
  agents,
  busyMap,
  onAction,
  onDelete,
  onCopy,
}: AgentsListContentProps) {
  const { t } = useLocale();

  if (loading) {
    return (
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 rounded-full bg-muted p-3">
            <Plus className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">{t.agentsList.noAgentsTitle}</p>
          <p className="text-xs text-muted-foreground">{t.agentsList.noAgentsSubtitle}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:gap-4 md:hidden">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            busy={busyMap[agent.agentId] ?? null}
            statusLoading={statusLoading}
            variant="mobile"
            onAction={onAction}
            onDelete={onDelete}
            onCopy={onCopy}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">{t.agentsList.columns.name}</th>
              <th className="px-4 py-3 text-left font-medium">{t.agentsList.columns.label}</th>
              <th className="px-4 py-3 text-left font-medium">{t.agentsList.columns.tags}</th>
              <th className="px-4 py-3 text-left font-medium">{t.agentsList.columns.status}</th>
              <th className="px-4 py-3 text-left font-medium">{t.agentsList.columns.memory}</th>
              <th className="px-4 py-3 text-right font-medium">{t.agentsList.columns.actions}</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                busy={busyMap[agent.agentId] ?? null}
                statusLoading={statusLoading}
                variant="table-row"
                onAction={onAction}
                onDelete={onDelete}
                onCopy={onCopy}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
