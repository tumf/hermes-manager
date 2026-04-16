'use client';

import { Plus } from 'lucide-react';

import { AgentCard, type ActionType, type AgentWithStatus } from '@/src/components/agent-card';
import { useLocale } from '@/src/components/locale-provider';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Skeleton } from '@/src/components/ui/skeleton';
import { cn } from '@/src/lib/utils';

interface AgentsListContentProps {
  loading: boolean;
  statusLoading?: boolean;
  agents: AgentWithStatus[];
  totalAgentCount?: number;
  availableTags?: string[];
  selectedTags?: string[];
  onToggleTag?: (tag: string) => void;
  onClearTags?: () => void;
  busyMap: Record<string, ActionType>;
  onAction: (agent: AgentWithStatus, action: ActionType) => Promise<void>;
  onDelete: (agentId: string) => Promise<void>;
  onCopy: (fromId: string) => Promise<void>;
}

export function AgentsListContent({
  loading,
  statusLoading = false,
  agents,
  totalAgentCount,
  availableTags = [],
  selectedTags = [],
  onToggleTag,
  onClearTags,
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

  const resolvedTotal = totalAgentCount ?? agents.length;
  const hasFilterUI = availableTags.length > 0 && !!onToggleTag;
  const filterActive = selectedTags.length > 0;

  const filterControls = hasFilterUI ? (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {t.agentsList.filterByTags}
        </span>
        {availableTags.map((tag) => {
          const active = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={active}
              onClick={() => onToggleTag?.(tag)}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {tag}
            </button>
          );
        })}
        {filterActive && onClearTags ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearTags}
            className="ml-auto h-7 px-2 text-xs"
          >
            {t.agentsList.clearFilters}
          </Button>
        ) : null}
      </div>
    </div>
  ) : null;

  if (resolvedTotal === 0) {
    return (
      <>
        {filterControls}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 rounded-full bg-muted p-3">
              <Plus className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">{t.agentsList.noAgentsTitle}</p>
            <p className="text-xs text-muted-foreground">{t.agentsList.noAgentsSubtitle}</p>
          </CardContent>
        </Card>
      </>
    );
  }

  if (agents.length === 0) {
    return (
      <>
        {filterControls}
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-sm font-medium">{t.agentsList.noMatchingTagsTitle}</p>
            <p className="text-xs text-muted-foreground">{t.agentsList.noMatchingTagsSubtitle}</p>
            {onClearTags ? (
              <Button type="button" variant="outline" size="sm" onClick={onClearTags}>
                {t.agentsList.clearFilters}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      {filterControls}
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
