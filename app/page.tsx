'use client';

import { Copy, EllipsisVertical, Play, Plus, Square, Trash2 } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/src/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { Skeleton } from '@/src/components/ui/skeleton';

interface Agent {
  id: number;
  agentId: string;
  home: string;
  label: string;
  enabled: boolean;
  createdAt: number | string;
}

interface AgentWithStatus extends Agent {
  running?: boolean;
}

export default function Home() {
  const [agents, setAgents] = useState<AgentWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [addBusy, setAddBusy] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('failed to fetch agents');
      const data: Agent[] = await res.json();
      const withStatus = await Promise.all(
        data.map(async (agent) => {
          try {
            const sr = await fetch('/api/launchd', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ agent: agent.agentId, action: 'status' }),
            });
            if (sr.ok) {
              const s = await sr.json();
              return { ...agent, running: !!s.running } as AgentWithStatus;
            }
          } catch {
            /* ignore */
          }
          return { ...agent, running: false } as AgentWithStatus;
        }),
      );
      setAgents(withStatus);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  async function handleAdd() {
    setAddBusy(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(typeof d.error === 'string' ? d.error : 'Failed to create');
        return;
      }
      const created = await res.json();
      toast.success(`Agent "${created.agentId}" created`);
      await fetchAgents();
    } finally {
      setAddBusy(false);
    }
  }

  async function handleStartStop(agent: AgentWithStatus, action: 'start' | 'stop') {
    try {
      const res = await fetch('/api/launchd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agent.agentId, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          typeof data.error === 'string'
            ? data.error
            : typeof data.stderr === 'string' && data.stderr.trim()
              ? data.stderr.trim()
              : `Failed to ${action} ${agent.agentId}`;
        toast.error(message);
        return;
      }
      toast.success(`${agent.agentId} ${action === 'start' ? 'started' : 'stopped'}`);
      await fetchAgents();
    } catch {
      toast.error(`Failed to ${action} ${agent.agentId}`);
    }
  }

  async function handleDelete(agentId: string) {
    try {
      await fetch(`/api/agents?id=${encodeURIComponent(agentId)}`, {
        method: 'DELETE',
      });
      toast.success(`Agent "${agentId}" deleted`);
      await fetchAgents();
    } catch {
      toast.error(`Failed to delete "${agentId}"`);
    }
  }

  async function handleCopy(fromId: string) {
    try {
      const res = await fetch('/api/agents/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(typeof d.error === 'string' ? d.error : 'Failed to copy');
        return;
      }
      const created = await res.json();
      toast.success(`Copied "${fromId}" → "${created.agentId}"`);
      await fetchAgents();
    } catch {
      toast.error('Failed to copy');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground">Manage your Hermes AI agents.</p>
        </div>
        <Button onClick={() => void handleAdd()} disabled={addBusy} className="h-11 gap-2">
          <Plus className="size-4" />
          {addBusy ? 'Adding...' : 'Add Agent'}
        </Button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
              </CardHeader>
              <CardFooter>
                <Skeleton className="h-9 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && agents.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 rounded-full bg-muted p-3">
              <Plus className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No agents yet</p>
            <p className="text-xs text-muted-foreground">Create your first agent to get started.</p>
          </CardContent>
        </Card>
      )}

      {/* --- Mobile: Card grid --- */}
      {!loading && agents.length > 0 && (
        <div className="grid gap-3 sm:gap-4 md:hidden">
          {agents.map((a) => (
            <Card key={a.id}>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate">
                    <Link
                      href={`/agents/${encodeURIComponent(a.agentId)}`}
                      className="hover:underline"
                    >
                      {a.agentId}
                    </Link>
                  </CardTitle>
                  {a.label && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">{a.label}</p>
                  )}
                </div>
                <Badge variant={a.running ? 'success' : 'muted'}>
                  <span
                    className={`mr-1.5 inline-block size-1.5 rounded-full ${a.running ? 'bg-green-600 dark:bg-green-400' : 'bg-muted-foreground/50'}`}
                  />
                  {a.running ? 'Running' : 'Stopped'}
                </Badge>
              </CardHeader>
              <CardFooter className="flex-wrap gap-2">
                {a.running ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleStartStop(a, 'stop')}
                  >
                    <Square className="size-3.5" />
                    Stop
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => void handleStartStop(a, 'start')}>
                    <Play className="size-3.5" />
                    Start
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/agents/${encodeURIComponent(a.agentId)}`}>Manage</Link>
                </Button>
                <AgentActionsMenu agent={a} onDelete={handleDelete} onCopy={handleCopy} />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* --- Desktop: Table --- */}
      {!loading && agents.length > 0 && (
        <div className="hidden overflow-x-auto rounded-lg border md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">ID</th>
                <th className="px-4 py-3 text-left font-medium">Label</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className="border-b transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/agents/${encodeURIComponent(a.agentId)}`}
                      className="hover:underline"
                    >
                      {a.agentId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.label || '--'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={a.running ? 'success' : 'muted'}>
                      <span
                        className={`mr-1.5 inline-block size-1.5 rounded-full ${a.running ? 'bg-green-600 dark:bg-green-400' : 'bg-muted-foreground/50'}`}
                      />
                      {a.running ? 'Running' : 'Stopped'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {a.running ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleStartStop(a, 'stop')}
                        >
                          <Square className="size-3.5" />
                          Stop
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => void handleStartStop(a, 'start')}>
                          <Play className="size-3.5" />
                          Start
                        </Button>
                      )}
                      <AgentActionsMenu agent={a} onDelete={handleDelete} onCopy={handleCopy} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
        {/* Copy — no name input needed */}
        <DropdownMenuItem onClick={() => void onCopy(agent.agentId)}>
          <Copy className="size-4" />
          Copy
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Delete confirmation */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
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
