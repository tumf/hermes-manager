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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/src/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { Input } from '@/src/components/ui/input';
import { Skeleton } from '@/src/components/ui/skeleton';

interface Agent {
  id: number;
  name: string;
  home: string;
  label: string;
  enabled: boolean;
  createdAt: number | string;
  updatedAt: number | string;
}

interface AgentWithStatus extends Agent {
  running?: boolean;
}

export default function Home() {
  const [agents, setAgents] = useState<AgentWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [addName, setAddName] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [copyTo, setCopyTo] = useState('');

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
              body: JSON.stringify({ agent: agent.name, action: 'status' }),
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = addName.trim();
    if (!trimmed) return;
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(trimmed)) {
      toast.error('Invalid name: use only a-z, 0-9, _, - (max 64 chars)');
      return;
    }
    setAddBusy(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(typeof d.error === 'string' ? d.error : 'Failed to create');
        return;
      }
      setAddName('');
      toast.success(`Agent "${trimmed}" created`);
      await fetchAgents();
    } finally {
      setAddBusy(false);
    }
  }

  async function handleStartStop(agent: AgentWithStatus, action: 'start' | 'stop') {
    try {
      await fetch('/api/launchd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agent.name, action }),
      });
      toast.success(`${agent.name} ${action === 'start' ? 'started' : 'stopped'}`);
      await fetchAgents();
    } catch {
      toast.error(`Failed to ${action} ${agent.name}`);
    }
  }

  async function handleDelete(name: string) {
    try {
      await fetch(`/api/agents?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      toast.success(`Agent "${name}" deleted`);
      await fetchAgents();
    } catch {
      toast.error(`Failed to delete "${name}"`);
    }
  }

  async function handleCopy(fromName: string, toName: string) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(toName)) {
      toast.error('Invalid name');
      return;
    }
    try {
      const res = await fetch('/api/agents/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromName, to: toName }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(typeof d.error === 'string' ? d.error : 'Failed to copy');
        return;
      }
      toast.success(`Copied "${fromName}" to "${toName}"`);
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
      </div>

      {/* Add agent form */}
      <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          placeholder="new-agent-name"
          aria-label="New agent name"
          className="h-11 sm:max-w-xs"
        />
        <Button type="submit" disabled={addBusy} className="h-11 gap-2">
          <Plus className="size-4" />
          {addBusy ? 'Adding...' : 'Add Agent'}
        </Button>
      </form>

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
                      href={`/agents/${encodeURIComponent(a.name)}`}
                      className="hover:underline"
                    >
                      {a.name}
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
                  <Link href={`/agents/${encodeURIComponent(a.name)}`}>Manage</Link>
                </Button>
                <AgentActionsMenu
                  agent={a}
                  onDelete={handleDelete}
                  onCopy={handleCopy}
                  copyTo={copyTo}
                  setCopyTo={setCopyTo}
                />
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
                <th className="px-4 py-3 text-left font-medium">Name</th>
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
                      href={`/agents/${encodeURIComponent(a.name)}`}
                      className="hover:underline"
                    >
                      {a.name}
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
                      <AgentActionsMenu
                        agent={a}
                        onDelete={handleDelete}
                        onCopy={handleCopy}
                        copyTo={copyTo}
                        setCopyTo={setCopyTo}
                      />
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
  copyTo,
  setCopyTo,
}: {
  agent: AgentWithStatus;
  onDelete: (name: string) => Promise<void>;
  onCopy: (from: string, to: string) => Promise<void>;
  copyTo: string;
  setCopyTo: (v: string) => void;
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
        {/* Copy dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setCopyTo('');
              }}
            >
              <Copy className="size-4" />
              Copy
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Copy Agent</DialogTitle>
              <DialogDescription>
                Create a copy of &quot;{agent.name}&quot; with a new name.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={copyTo}
              onChange={(e) => setCopyTo(e.target.value)}
              placeholder="new-agent-name"
              aria-label="New agent name for copy"
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={() => void onCopy(agent.name, copyTo)} disabled={!copyTo.trim()}>
                  Copy
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              <AlertDialogTitle>Delete &quot;{agent.name}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The agent and all associated files will be permanently
                removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => void onDelete(agent.name)}
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
