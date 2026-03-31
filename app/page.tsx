'use client';

import {
  Copy,
  EllipsisVertical,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Square,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Skeleton } from '@/src/components/ui/skeleton';
import { useLaunchdAction } from '@/src/hooks/use-launchd-action';

interface Agent {
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

interface AgentWithStatus extends Agent {
  running?: boolean;
}

interface TemplateEntry {
  name: string;
  files: string[];
}

export default function Home() {
  const [agents, setAgents] = useState<AgentWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [addBusy, setAddBusy] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addTemplateAgentsMd, setAddTemplateAgentsMd] = useState('default');
  const [addTemplateSoulMd, setAddTemplateSoulMd] = useState('default');
  const [addTemplateConfigYaml, setAddTemplateConfigYaml] = useState('default');
  const [addName, setAddName] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addTags, setAddTags] = useState('');
  const [allTemplates, setAllTemplates] = useState<TemplateEntry[]>([]);

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

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data: TemplateEntry[] = await res.json();
        setAllTemplates(data);
      }
    } catch {
      // Templates fetch is non-critical; dialog still works with no templates
    }
  }, []);

  const agentsMdTemplates = useMemo(
    () => allTemplates.filter((t) => t.files.includes('AGENTS.md')),
    [allTemplates],
  );
  const soulMdTemplates = useMemo(
    () => allTemplates.filter((t) => t.files.includes('SOUL.md')),
    [allTemplates],
  );
  const configYamlTemplates = useMemo(
    () => allTemplates.filter((t) => t.files.includes('config.yaml')),
    [allTemplates],
  );

  useEffect(() => {
    void fetchAgents();
    void fetchTemplates();
  }, [fetchAgents, fetchTemplates]);

  async function handleAdd() {
    setAddBusy(true);
    try {
      const templates: Record<string, string> = {};
      if (addTemplateAgentsMd && addTemplateAgentsMd !== 'default') {
        templates.agentsMd = addTemplateAgentsMd;
      }
      if (addTemplateSoulMd && addTemplateSoulMd !== 'default') {
        templates.soulMd = addTemplateSoulMd;
      }
      if (addTemplateConfigYaml && addTemplateConfigYaml !== 'default') {
        templates.configYaml = addTemplateConfigYaml;
      }

      const body: Record<string, unknown> = {};
      if (Object.keys(templates).length > 0) {
        body.templates = templates;
      }

      const parsedTags = addTags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      if (addName.trim() || addDescription.trim() || parsedTags.length > 0) {
        body.meta = {
          name: addName.trim(),
          description: addDescription.trim(),
          tags: parsedTags,
        };
      }

      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(typeof d.error === 'string' ? d.error : 'Failed to create');
        return;
      }
      const created = await res.json();
      setAddTemplateAgentsMd('default');
      setAddTemplateSoulMd('default');
      setAddTemplateConfigYaml('default');
      setAddName('');
      setAddDescription('');
      setAddTags('');
      setAddDialogOpen(false);
      toast.success(`Agent "${created.agentId}" created`);
      await fetchAgents();
    } finally {
      setAddBusy(false);
    }
  }

  async function handleDelete(agentId: string) {
    try {
      await fetch(`/api/agents?id=${encodeURIComponent(agentId)}&purge=true`, {
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
      </div>

      {/* Add agent dialog */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (open) void fetchTemplates();
        }}
      >
        <DialogTrigger asChild>
          <Button className="h-11 gap-2">
            <Plus className="size-4" />
            Add Agent
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleAdd();
            }}
          >
            <DialogHeader>
              <DialogTitle>Add Agent</DialogTitle>
              <DialogDescription>
                Create a new agent with an auto-generated ID and optional template selection.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="agent-name" className="text-sm font-medium">
                  Display Name
                </label>
                <Input
                  id="agent-name"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="My Bot"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="agent-description" className="text-sm font-medium">
                  Description
                </label>
                <Input
                  id="agent-description"
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder="用途やメモ"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="agent-tags" className="text-sm font-medium">
                  Tags (comma separated)
                </label>
                <Input
                  id="agent-tags"
                  value={addTags}
                  onChange={(e) => setAddTags(e.target.value)}
                  placeholder="prod, monitor"
                />
              </div>
              <TemplateSelect
                label="AGENTS.md Template"
                id="tpl-agents-md"
                value={addTemplateAgentsMd}
                onValueChange={setAddTemplateAgentsMd}
                templates={agentsMdTemplates}
              />
              <TemplateSelect
                label="SOUL.md Template"
                id="tpl-soul-md"
                value={addTemplateSoulMd}
                onValueChange={setAddTemplateSoulMd}
                templates={soulMdTemplates}
              />
              <TemplateSelect
                label="config.yaml Template"
                id="tpl-config-yaml"
                value={addTemplateConfigYaml}
                onValueChange={setAddTemplateConfigYaml}
                templates={configYamlTemplates}
              />
            </div>
            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={addBusy}>
                {addBusy ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                      {a.name?.trim() ? (
                        <>
                          {a.name}{' '}
                          <span className="font-mono text-[10px] font-normal text-muted-foreground">
                            {a.agentId}
                          </span>
                        </>
                      ) : (
                        <span className="font-mono">{a.agentId}</span>
                      )}
                    </Link>
                  </CardTitle>
                  <div className="mt-1 space-y-1">
                    <p className="truncate text-xs text-muted-foreground">{a.label || '--'}</p>
                    {a.tags && a.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {a.tags.map((tag) => (
                          <Badge
                            key={`${a.agentId}-${tag}`}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <AgentControlCluster agent={a} onActionCompleted={fetchAgents} />
              </CardHeader>
              <CardFooter className="flex-wrap gap-2">
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
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Label</th>
                <th className="px-4 py-3 text-left font-medium">Tags</th>
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
                      {a.name?.trim() ? (
                        <>
                          {a.name}{' '}
                          <span className="font-mono text-[10px] font-normal text-muted-foreground">
                            {a.agentId}
                          </span>
                        </>
                      ) : (
                        <span className="font-mono">{a.agentId}</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.label || '--'}</td>
                  <td className="px-4 py-3">
                    {a.tags && a.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {a.tags.map((tag) => (
                          <Badge
                            key={`${a.agentId}-table-${tag}`}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <AgentControlCluster agent={a} onActionCompleted={fetchAgents} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
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

type ActionType = 'start' | 'stop' | 'restart';

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

function AgentControlCluster({
  agent,
  onActionCompleted,
}: {
  agent: AgentWithStatus;
  onActionCompleted: () => Promise<void>;
}) {
  const { busyAction, execute } = useLaunchdAction(agent.agentId, {
    onSuccess: onActionCompleted,
  });

  return (
    <div className="flex items-center gap-2">
      <AgentStatusBadge running={agent.running} busy={busyAction} />
      <AgentActionButtons
        agent={agent}
        busy={busyAction}
        onAction={(_target, action) => {
          void execute(action);
        }}
      />
    </div>
  );
}

function AgentActionButtons({
  agent,
  busy,
  onAction,
}: {
  agent: AgentWithStatus;
  busy: ActionType | null;
  onAction: (agent: AgentWithStatus, action: ActionType) => void;
}) {
  const disabled = busy !== null;
  return agent.running ? (
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
  ) : (
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

function TemplateSelect({
  label,
  id,
  value,
  onValueChange,
  templates,
}: {
  label: string;
  id: string;
  value: string;
  onValueChange: (v: string) => void;
  templates: TemplateEntry[];
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="default" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">default</SelectItem>
          {templates
            .filter((t) => t.name !== 'default')
            .map((t) => (
              <SelectItem key={t.name} value={t.name}>
                {t.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
