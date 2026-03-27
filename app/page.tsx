'use client';

import React, { useCallback, useEffect, useState } from 'react';

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
import { Input } from '@/src/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';

interface Agent {
  id: number;
  name: string;
  home: string;
  label: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

interface AgentWithStatus extends Agent {
  running?: boolean;
}

export default function Home() {
  const [agents, setAgents] = useState<AgentWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addName, setAddName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [copyName, setCopyName] = useState('');
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyOpen, setCopyOpen] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed to fetch agents');
      const data: Agent[] = await res.json();
      // Fetch launchd status for each agent
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
              return { ...agent, running: s.running as boolean };
            }
          } catch {
            // ignore status errors
          }
          return { ...agent, running: false };
        }),
      );
      setAgents(withStatus);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  async function handleStartStop(agent: AgentWithStatus, action: 'start' | 'stop') {
    await fetch('/api/launchd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: agent.name, action }),
    });
    void fetchAgents();
  }

  async function handleDelete(name: string) {
    await fetch(`/api/agents?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
    void fetchAgents();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!addName.trim()) {
      setAddError('Name is required');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(addName)) {
      setAddError('Name must contain only letters, numbers, hyphens, and underscores');
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName }),
      });
      if (!res.ok) {
        const d = await res.json();
        setAddError(typeof d.error === 'string' ? d.error : 'Failed to create agent');
        return;
      }
      setAddName('');
      void fetchAgents();
    } finally {
      setAddLoading(false);
    }
  }

  async function handleCopy(fromName: string) {
    setCopyError(null);
    if (!copyName.trim()) {
      setCopyError('Name is required');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(copyName)) {
      setCopyError('Name must contain only letters, numbers, hyphens, and underscores');
      return;
    }
    setCopyLoading(true);
    try {
      const res = await fetch('/api/agents/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromName, to: copyName }),
      });
      if (!res.ok) {
        const d = await res.json();
        setCopyError(typeof d.error === 'string' ? d.error : 'Failed to copy agent');
        return;
      }
      setCopyOpen(null);
      setCopyName('');
      void fetchAgents();
    } finally {
      setCopyLoading(false);
    }
  }

  // busy state reserved for future optimistic UI
  // const isBusy = addLoading || copyLoading;

  return (
    <main className="mx-auto max-w-4xl p-4 pt-14 sm:p-6 sm:pt-6">
      <h1 className="mb-2 text-2xl font-semibold">Hermes Agents</h1>

      {/* Add Agent Form */}
      <form
        onSubmit={handleAdd}
        className="mb-6 grid grid-cols-1 gap-2 sm:flex sm:flex-row sm:items-center"
      >
        <Input
          placeholder="New agent name"
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          className="w-full sm:w-64"
          aria-label="New agent name"
        />
        <Button type="submit" disabled={addLoading} className="min-h-11">
          {addLoading ? 'Adding…' : 'Add Agent'}
        </Button>
        {addError && <span className="text-sm text-red-600">{addError}</span>}
      </form>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          {/* Mobile: card grid */}
          <div className="grid gap-3 sm:gap-4 md:hidden">
            {agents.length === 0 && (
              <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                No agents yet.
              </div>
            )}
            {agents.map((agent) => (
              <div key={agent.id} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold">{agent.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{agent.label}</div>
                  </div>
                  <Badge variant={agent.enabled ? 'success' : 'muted'}>
                    {agent.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="mb-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${agent.running ? 'bg-green-500' : 'bg-gray-400'}`}
                    />
                    {agent.running ? 'Running' : 'Stopped'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {agent.running ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartStop(agent, 'stop')}
                    >
                      Stop
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => handleStartStop(agent, 'start')}>
                      Start
                    </Button>
                  )}

                  <Dialog
                    open={copyOpen === agent.name}
                    onOpenChange={(open) => {
                      if (!open) {
                        setCopyOpen(null);
                        setCopyName('');
                        setCopyError(null);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => setCopyOpen(agent.name)}>
                        Copy
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Copy Agent</DialogTitle>
                        <DialogDescription>
                          Enter a name for the new agent copied from &ldquo;{agent.name}&rdquo;.
                        </DialogDescription>
                      </DialogHeader>
                      <Input
                        placeholder="New agent name"
                        value={copyName}
                        onChange={(e) => setCopyName(e.target.value)}
                        aria-label="Copy agent name"
                      />
                      {copyError && <p className="mt-1 text-sm text-red-600">{copyError}</p>}
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={() => handleCopy(agent.name)} disabled={copyLoading}>
                          {copyLoading ? 'Copying…' : 'Copy'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete &ldquo;{agent.name}&rdquo;?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. The agent will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                          <Button variant="outline">Cancel</Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <Button variant="destructive" onClick={() => handleDelete(agent.name)}>
                            Confirm
                          </Button>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.length === 0 && (
                  <TableRow>
                    <TableCell className="text-gray-500" colSpan={4}>
                      No agents yet.
                    </TableCell>
                  </TableRow>
                )}
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>
                      <Badge variant={agent.enabled ? 'success' : 'muted'}>
                        {agent.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 text-xs ${agent.running ? 'text-green-700' : 'text-gray-500'}`}
                      >
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${agent.running ? 'bg-green-500' : 'bg-gray-400'}`}
                        />
                        {agent.running ? 'Running' : 'Stopped'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {agent.running ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartStop(agent, 'stop')}
                          >
                            Stop
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleStartStop(agent, 'start')}
                          >
                            Start
                          </Button>
                        )}

                        {/* Copy Dialog */}
                        <Dialog
                          open={copyOpen === agent.name}
                          onOpenChange={(open) => {
                            if (!open) {
                              setCopyOpen(null);
                              setCopyName('');
                              setCopyError(null);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCopyOpen(agent.name)}
                            >
                              Copy
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Copy Agent</DialogTitle>
                              <DialogDescription>
                                Enter a name for the new agent copied from &ldquo;{agent.name}
                                &rdquo;.
                              </DialogDescription>
                            </DialogHeader>
                            <Input
                              placeholder="New agent name"
                              value={copyName}
                              onChange={(e) => setCopyName(e.target.value)}
                              aria-label="Copy agent name"
                            />
                            {copyError && <p className="mt-1 text-sm text-red-600">{copyError}</p>}
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                              </DialogClose>
                              <Button onClick={() => handleCopy(agent.name)} disabled={copyLoading}>
                                {copyLoading ? 'Copying…' : 'Copy'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {/* Delete AlertDialog */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete &ldquo;{agent.name}&rdquo;?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. The agent will be permanently removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel asChild>
                                <Button variant="outline">Cancel</Button>
                              </AlertDialogCancel>
                              <AlertDialogAction asChild>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleDelete(agent.name)}
                                >
                                  Confirm
                                </Button>
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </main>
  );
}
