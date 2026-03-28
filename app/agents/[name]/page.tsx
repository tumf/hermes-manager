'use client';

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Play,
  Plus,
  Save,
  ScrollText,
  Settings,
  Square,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { use, useCallback, useEffect, useRef, useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Checkbox } from '@/src/components/ui/checkbox';
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
import { Skeleton } from '@/src/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';

interface AgentPageProps {
  params: Promise<{ name: string }>;
}

export default function AgentPage({ params }: AgentPageProps) {
  const { name } = use(params);

  const [status, setStatus] = useState<{
    running: boolean;
    label?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/launchd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: name, action: 'status' }),
      });
      if (res.ok) setStatus(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  async function handleStartStop(action: 'start' | 'stop') {
    setActionBusy(true);
    try {
      const res = await fetch('/api/launchd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: name, action }),
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
      toast.success(`${name} ${action === 'start' ? 'started' : 'stopped'}`);
      await fetchStatus();
    } catch {
      toast.error(`Failed to ${action}`);
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Agents
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          {status?.label && <p className="text-sm text-muted-foreground">{status.label}</p>}
        </div>
        <div className="flex items-center gap-3">
          {loading ? (
            <Skeleton className="h-9 w-24" />
          ) : (
            <>
              <Badge variant={status?.running ? 'success' : 'muted'}>
                <span
                  className={`mr-1.5 inline-block size-1.5 rounded-full ${status?.running ? 'bg-green-600 dark:bg-green-400' : 'bg-muted-foreground/50'}`}
                />
                {status?.running ? 'Running' : 'Stopped'}
              </Badge>
              {status?.running ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleStartStop('stop')}
                  disabled={actionBusy}
                >
                  {actionBusy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Square className="size-3.5" />
                  )}
                  Stop
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => void handleStartStop('start')}
                  disabled={actionBusy}
                >
                  {actionBusy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Play className="size-3.5" />
                  )}
                  Start
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="memory">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="memory" className="gap-1.5">
            <FileText className="size-3.5" />
            <span className="hidden sm:inline">Memory</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5">
            <Settings className="size-3.5" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
          <TabsTrigger value="env" className="gap-1.5">
            <Settings className="size-3.5" />
            <span className="hidden sm:inline">Env</span>
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-1.5">
            <Settings className="size-3.5" />
            <span className="hidden sm:inline">Skills</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <ScrollText className="size-3.5" />
            <span className="hidden sm:inline">Logs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="memory">
          <div className="grid gap-4 lg:grid-cols-2">
            <FileEditor name={name} filePath="AGENTS.md" label="AGENTS.md" />
            <FileEditor name={name} filePath="SOUL.md" label="SOUL.md" />
          </div>
        </TabsContent>

        <TabsContent value="config">
          <FileEditor name={name} filePath="config.yaml" label="config.yaml" />
        </TabsContent>

        <TabsContent value="env">
          <AgentEnvTab name={name} />
        </TabsContent>

        <TabsContent value="skills">
          <SkillsTab name={name} />
        </TabsContent>

        <TabsContent value="logs">
          <LogViewer name={name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FileEditor({ name, filePath, label }: { name: string; filePath: string; label: string }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const originalRef = useRef('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/files?agent=${encodeURIComponent(name)}&path=${encodeURIComponent(filePath)}`,
        );
        if (res.ok) {
          const data = await res.json();
          const text = typeof data === 'string' ? data : (data.content ?? '');
          setContent(text);
          originalRef.current = text;
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [name, filePath]);

  function handleChange(val: string) {
    setContent(val);
    setDirty(val !== originalRef.current);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: name, path: filePath, content }),
      });
      if (res.ok) {
        originalRef.current = content;
        setDirty(false);
        toast.success(`${label} saved`);
      } else {
        toast.error(`Failed to save ${label}`);
      }
    } catch {
      toast.error(`Failed to save ${label}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="font-mono text-xs">{label}</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void save()}
          disabled={saving || loading || !dirty}
          className="gap-1.5"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <textarea
            className="min-h-48 w-full resize-y rounded-md border border-input bg-muted/30 p-3 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            aria-label={`Edit ${label}`}
          />
        )}
      </CardContent>
    </Card>
  );
}

type EnvVisibility = 'plain' | 'secure';

interface AgentEnvRow {
  key: string;
  value: string;
  masked: boolean;
  visibility: EnvVisibility;
}

function AgentEnvTab({ name }: { name: string }) {
  const [rows, setRows] = useState<AgentEnvRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    try {
      const res = await fetch(`/api/env?agent=${encodeURIComponent(name)}`);
      if (!res.ok) {
        throw new Error('failed to fetch env rows');
      }
      setRows(await res.json());
    } catch {
      toast.error('Failed to load env vars');
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  async function handleDelete(key: string) {
    try {
      const res = await fetch(
        `/api/env?agent=${encodeURIComponent(name)}&key=${encodeURIComponent(key)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        throw new Error('delete failed');
      }
      toast.success(`Deleted ${key}`);
      await fetchRows();
    } catch {
      toast.error(`Failed to delete ${key}`);
    }
  }

  if (loading) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <div className="space-y-4">
      <AgentEnvAddForm agentName={name} onSaved={fetchRows} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Environment variables</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No env vars yet.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-sm font-medium">{row.key}</div>
                    <div className="truncate font-mono text-xs text-muted-foreground">
                      {row.masked ? '***' : row.value}
                    </div>
                    <Badge variant={row.visibility === 'secure' ? 'secondary' : 'muted'}>
                      {row.visibility}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <AgentEnvEditDialog agentName={name} row={row} onSaved={fetchRows} />
                    <AgentEnvDeleteButton keyName={row.key} onDelete={handleDelete} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AgentEnvAddForm({
  agentName,
  onSaved,
}: {
  agentName: string;
  onSaved: () => Promise<void>;
}) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [visibility, setVisibility] = useState<EnvVisibility>('plain');
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={async (e) => {
        e.preventDefault();
        const trimmed = key.trim();
        if (!trimmed) {
          toast.error('Key is required');
          return;
        }

        setSaving(true);
        try {
          const res = await fetch('/api/env', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent: agentName, key: trimmed, value, visibility }),
          });
          if (!res.ok) {
            throw new Error('save failed');
          }
          setKey('');
          setValue('');
          setVisibility('plain');
          toast.success(`Saved ${trimmed}`);
          await onSaved();
        } catch {
          toast.error('Failed to save env var');
        } finally {
          setSaving(false);
        }
      }}
    >
      <Input
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="KEY_NAME"
        aria-label="Env key"
        className="h-10 font-mono sm:max-w-48"
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="value"
        aria-label="Env value"
        className="h-10 font-mono sm:flex-1"
      />
      <select
        value={visibility}
        onChange={(e) => setVisibility(e.target.value as EnvVisibility)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        aria-label="Visibility"
      >
        <option value="plain">plain</option>
        <option value="secure">secure</option>
      </select>
      <Button type="submit" disabled={saving} className="h-10 gap-1.5">
        <Plus className="size-3.5" />
        {saving ? 'Saving...' : 'Add'}
      </Button>
    </form>
  );
}

function AgentEnvEditDialog({
  agentName,
  row,
  onSaved,
}: {
  agentName: string;
  row: AgentEnvRow;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [visibility, setVisibility] = useState<EnvVisibility>(row.visibility);
  const [saving, setSaving] = useState(false);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <Settings className="size-4" />
          <span className="sr-only">Edit {row.key}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {row.key}</DialogTitle>
          <DialogDescription>Update value and visibility.</DialogDescription>
        </DialogHeader>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={row.masked ? 'Enter new value (optional)' : row.value}
          aria-label={`${row.key} value`}
        />
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as EnvVisibility)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Visibility"
        >
          <option value="plain">plain</option>
          <option value="secure">secure</option>
        </select>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              disabled={saving || (value.length === 0 && visibility === row.visibility)}
              onClick={async () => {
                setSaving(true);
                try {
                  const payload: {
                    agent: string;
                    key: string;
                    visibility: EnvVisibility;
                    value?: string;
                  } = {
                    agent: agentName,
                    key: row.key,
                    visibility,
                  };
                  if (value.length > 0) {
                    payload.value = value;
                  }

                  const res = await fetch('/api/env', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });
                  if (!res.ok) {
                    throw new Error('save failed');
                  }
                  toast.success(`Updated ${row.key}`);
                  await onSaved();
                } catch {
                  toast.error(`Failed to update ${row.key}`);
                } finally {
                  setSaving(false);
                }
              }}
            >
              Save
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AgentEnvDeleteButton({
  keyName,
  onDelete,
}: {
  keyName: string;
  onDelete: (key: string) => Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Delete {keyName}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{keyName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This variable will be removed from the current agent.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => void onDelete(keyName)}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface SkillNode {
  name: string;
  relativePath: string;
  hasSkill: boolean;
  children: SkillNode[];
}

interface EquippedLink {
  id: number;
  agent: string;
  sourcePath: string;
  targetPath: string;
  exists: boolean;
  relativePath: string;
}

function SkillsTab({ name }: { name: string }) {
  const [tree, setTree] = useState<SkillNode[]>([]);
  const [equipped, setEquipped] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadSkills() {
      try {
        const [treeRes, linksRes] = await Promise.all([
          fetch('/api/skills/tree'),
          fetch(`/api/skills/links?agent=${encodeURIComponent(name)}`),
        ]);

        if (treeRes.ok) {
          const data = await treeRes.json();
          setTree(data.tree || []);
        }

        if (linksRes.ok) {
          const links = await linksRes.json();
          const equippedSet = new Set<string>(
            links
              .filter((link: EquippedLink) => link.exists)
              .map((link: EquippedLink) => link.relativePath),
          );
          setEquipped(equippedSet);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    void loadSkills();
  }, [name]);

  async function handleToggle(relativePath: string, checked: boolean) {
    setActioning((s) => new Set([...s, relativePath]));

    try {
      if (checked) {
        const res = await fetch('/api/skills/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: name, relativePath }),
        });

        if (res.ok) {
          setEquipped((s) => new Set([...s, relativePath]));
          toast.success(`Equipped ${relativePath}`);
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(typeof err.error === 'string' ? err.error : 'Failed to equip skill');
        }
      } else {
        // Find the link ID from equipped list
        const linksRes = await fetch(`/api/skills/links?agent=${encodeURIComponent(name)}`);
        if (!linksRes.ok) {
          toast.error('Failed to fetch links');
          return;
        }

        const links = await linksRes.json();
        const link = links.find((l: EquippedLink) => l.relativePath === relativePath);

        if (!link) {
          toast.error('Link not found');
          return;
        }

        const delRes = await fetch(`/api/skills/links?id=${link.id}`, { method: 'DELETE' });

        if (delRes.ok) {
          setEquipped((s) => {
            const next = new Set(s);
            next.delete(relativePath);
            return next;
          });
          toast.success(`Unequipped ${relativePath}`);
        } else {
          const err = await delRes.json().catch(() => ({}));
          toast.error(typeof err.error === 'string' ? err.error : 'Failed to unequip skill');
        }
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActioning((s) => {
        const next = new Set(s);
        next.delete(relativePath);
        return next;
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Skills</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : tree.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skills available in ~/.agents/skills</p>
        ) : (
          <div className="space-y-1">
            {tree.map((node) => (
              <SkillTreeNode
                key={node.relativePath}
                node={node}
                equipped={equipped}
                actioning={actioning}
                onToggle={handleToggle}
                depth={0}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SkillTreeNode({
  node,
  equipped,
  actioning,
  onToggle,
  depth,
}: {
  node: SkillNode;
  equipped: Set<string>;
  actioning: Set<string>;
  onToggle: (path: string, checked: boolean) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2 py-1" style={{ paddingLeft: `${depth * 1.5}rem` }}>
        {node.children.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex size-5 items-center justify-center rounded hover:bg-muted"
          >
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        )}

        {node.children.length === 0 && <div className="size-5" />}

        {node.hasSkill ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Checkbox
              checked={equipped.has(node.relativePath)}
              onCheckedChange={(checked) => void onToggle(node.relativePath, checked === true)}
              disabled={actioning.has(node.relativePath)}
              className="mt-0.5"
            />
            <label className="text-sm font-medium truncate select-none cursor-pointer flex-1">
              {node.name}
            </label>
            {actioning.has(node.relativePath) && <Loader2 className="size-3 animate-spin flex-shrink-0" />}
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-medium text-muted-foreground">{node.name}</span>
          </div>
        )}
      </div>

      {expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <SkillTreeNode
              key={child.relativePath}
              node={child}
              equipped={equipped}
              actioning={actioning}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LogViewer({ name }: { name: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFile, setActiveFile] = useState('gateway.log');
  const logRef = useRef<HTMLPreElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/logs?agent=${encodeURIComponent(name)}&file=${encodeURIComponent(activeFile)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setLines(data.lines || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [name, activeFile]);

  useEffect(() => {
    void load();
  }, [load]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [lines]);

  const logFiles = ['gateway.log', 'gateway.error.log', 'errors.log'];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="text-sm">Logs</CardTitle>
        <div className="flex gap-1">
          {logFiles.map((f) => (
            <Button
              key={f}
              variant={activeFile === f ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2 font-mono text-xs"
              onClick={() => setActiveFile(f)}
            >
              {f.replace('.log', '')}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <pre
            ref={logRef}
            className="max-h-96 overflow-y-auto rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed"
          >
            {lines.length ? lines.join('\n') : '(empty)'}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
