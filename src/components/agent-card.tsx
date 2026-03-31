'use client';

import { Copy, EllipsisVertical, Loader2, Play, RotateCcw, Square, Trash2 } from 'lucide-react';
import Link from 'next/link';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/src/components/ui/alert-dialog';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Card, CardFooter, CardHeader, CardTitle } from '@/src/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';

export interface Agent {
  id: number;
  agentId: string;
  home: string;
  label: string;
  enabled: boolean;
  createdAt: number | string;
  name?: string;
  description?: string;
  tags?: string[];
}

export interface AgentWithStatus extends Agent {
  running?: boolean;
}

export type ActionType = 'start' | 'stop' | 'restart';

interface AgentCardProps {
  agent: AgentWithStatus;
  busy: ActionType | null;
  variant: 'mobile' | 'table-row';
  onAction: (agent: AgentWithStatus, action: ActionType) => Promise<void>;
  onDelete: (agentId: string) => Promise<void>;
  onCopy: (fromId: string) => Promise<void>;
}

export function AgentCard({ agent, busy, variant, onAction, onDelete, onCopy }: AgentCardProps) {
  if (variant === 'table-row') {
    return (
      <tr className="border-b transition-colors hover:bg-muted/30">
        <td className="px-4 py-3 font-medium">
          <AgentLink agent={agent} />
        </td>
        <td className="px-4 py-3 text-muted-foreground">{agent.label || '--'}</td>
        <td className="px-4 py-3">
          <AgentTags agent={agent} table />
        </td>
        <td className="px-4 py-3">
          <AgentStatusBadge running={agent.running} busy={busy} />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            <AgentActionButtons agent={agent} busy={busy} onAction={onAction} />
            <AgentActionsMenu agent={agent} onDelete={onDelete} onCopy={onCopy} />
          </div>
        </td>
      </tr>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate">
            <AgentLink agent={agent} />
          </CardTitle>
          <div className="mt-1 space-y-1">
            <p className="truncate text-xs text-muted-foreground">{agent.label || '--'}</p>
            <AgentTags agent={agent} />
          </div>
        </div>
        <AgentStatusBadge running={agent.running} busy={busy} />
      </CardHeader>
      <CardFooter className="flex-wrap gap-2">
        <AgentActionButtons agent={agent} busy={busy} onAction={onAction} />
        <Button variant="outline" size="sm" asChild>
          <Link href={`/agents/${encodeURIComponent(agent.agentId)}`}>Manage</Link>
        </Button>
        <AgentActionsMenu agent={agent} onDelete={onDelete} onCopy={onCopy} />
      </CardFooter>
    </Card>
  );
}

function AgentLink({ agent }: { agent: AgentWithStatus }) {
  return (
    <Link href={`/agents/${encodeURIComponent(agent.agentId)}`} className="hover:underline">
      {agent.name?.trim() ? (
        <>
          {agent.name}{' '}
          <span className="font-mono text-[10px] font-normal text-muted-foreground">
            {agent.agentId}
          </span>
        </>
      ) : (
        <span className="font-mono">{agent.agentId}</span>
      )}
    </Link>
  );
}

function AgentTags({ agent, table = false }: { agent: AgentWithStatus; table?: boolean }) {
  if (!agent.tags || agent.tags.length === 0) {
    return table ? <span className="text-muted-foreground">--</span> : null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {agent.tags.map((tag) => (
        <Badge
          key={`${agent.agentId}-${table ? 'table' : 'card'}-${tag}`}
          variant="outline"
          className="text-[10px]"
        >
          {tag}
        </Badge>
      ))}
    </div>
  );
}

function AgentActionsMenu({
  agent,
  onDelete,
  onCopy,
}: {
  agent: AgentWithStatus;
  onDelete: (agentId: string) => Promise<void>;
  onCopy: (fromId: string) => Promise<void>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9">
          <EllipsisVertical className="size-4" />
          <span className="sr-only">More actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void onCopy(agent.agentId)}>
          <Copy className="size-4" />
          Copy
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              onSelect={(event) => event.preventDefault()}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete &quot;{agent.agentId}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The agent and all associated files will be permanently
                removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => void onDelete(agent.agentId)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AgentStatusBadge({ running, busy }: { running?: boolean; busy: ActionType | null }) {
  const transitioning = busy !== null;
  return (
    <Badge variant={transitioning ? 'outline' : running ? 'success' : 'muted'}>
      {transitioning ? (
        <Loader2 className="mr-1.5 size-3 animate-spin" />
      ) : (
        <span
          className={`mr-1.5 inline-block size-1.5 rounded-full ${running ? 'bg-green-600 dark:bg-green-400' : 'bg-muted-foreground/50'}`}
        />
      )}
      {busy === 'start'
        ? 'Starting…'
        : busy === 'stop'
          ? 'Stopping…'
          : busy === 'restart'
            ? 'Restarting…'
            : running
              ? 'Running'
              : 'Stopped'}
    </Badge>
  );
}

function AgentActionButtons({
  agent,
  busy,
  onAction,
}: {
  agent: AgentWithStatus;
  busy: ActionType | null;
  onAction: (agent: AgentWithStatus, action: ActionType) => Promise<void>;
}) {
  const disabled = busy !== null;

  if (agent.running) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void onAction(agent, 'stop')}
          disabled={disabled}
        >
          {busy === 'stop' ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Square className="size-3.5" />
          )}
          Stop
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void onAction(agent, 'restart')}
          disabled={disabled}
        >
          {busy === 'restart' ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5" />
          )}
          Restart
        </Button>
      </>
    );
  }

  return (
    <Button size="sm" onClick={() => void onAction(agent, 'start')} disabled={disabled}>
      {busy === 'start' ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Play className="size-3.5" />
      )}
      Start
    </Button>
  );
}
