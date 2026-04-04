'use client';

import { Plus } from 'lucide-react';

import { AgentCard, type ActionType, type AgentWithStatus } from '@/src/components/agent-card';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Skeleton } from '@/src/components/ui/skeleton';

interface AgentsListContentProps {
  loading: boolean;
  agents: AgentWithStatus[];
  busyMap: Record<string, ActionType>;
  onAction: (agent: AgentWithStatus, action: ActionType) => Promise<void>;
  onDelete: (agentId: string) => Promise<void>;
  onCopy: (fromId: string) => Promise<void>;
}

export function AgentsListContent({
  loading,
  agents,
  busyMap,
  onAction,
  onDelete,
  onCopy,
}: AgentsListContentProps) {
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
          <p className="text-sm font-medium">No agents yet</p>
          <p className="text-xs text-muted-foreground">Create your first agent to get started.</p>
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
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Label</th>
              <th className="px-4 py-3 text-left font-medium">Tags</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Memory</th>
              <th className="px-4 py-3 text-left font-medium">Hermes</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                busy={busyMap[agent.agentId] ?? null}
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
