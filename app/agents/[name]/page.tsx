'use client';

import {
  ChevronLeft,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Play,
  Save,
  ScrollText,
  Settings,
  Square,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';

interface AgentPageProps {
  params: Promise<{ name: string }> | { name: string };
}

interface AgentEnvEntry {
  key: string;
  value: string;
  masked: boolean;
}

type EnvSource = 'global' | 'agent' | 'agent-override';

interface ResolvedEnvEntry {
  key: string;
  value: string;
  source: EnvSource;
}

export default function AgentPage({ params }: AgentPageProps) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const { name } = resolvedParams;

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
            <span className="text-xs font-semibold">ENV</span>
            <span className="hidden sm:inline">Env</span>
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

        <TabsContent value="env" forceMount>
          <AgentEnvTab name={name} />
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

function AgentEnvTab({ name }: { name: string }) {
  const [envEntries, setEnvEntries] = useState<AgentEnvEntry[]>([]);
  const [resolvedEntries, setResolvedEntries] = useState<ResolvedEnvEntry[]>([]);
  const [loadingEnv, setLoadingEnv] = useState(true);
  const [loadingResolved, setLoadingResolved] = useState(true);
  const [reveal, setReveal] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const loadEnv = useCallback(async () => {
    setLoadingEnv(true);
    try {
      const url = `/api/env?agent=${encodeURIComponent(name)}${reveal ? '&reveal=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('failed to load env');
      }
      const data = (await res.json()) as AgentEnvEntry[];
      setEnvEntries(data);
    } catch {
      toast.error('Failed to load env vars');
    } finally {
      setLoadingEnv(false);
    }
  }, [name, reveal]);

  const loadResolved = useCallback(async () => {
    setLoadingResolved(true);
    try {
      const res = await fetch(`/api/env/resolved?agent=${encodeURIComponent(name)}`);
      if (!res.ok) {
        throw new Error('failed to load resolved env');
      }
      const data = (await res.json()) as ResolvedEnvEntry[];
      setResolvedEntries(data);
    } catch {
      toast.error('Failed to load resolved env');
    } finally {
      setLoadingResolved(false);
    }
  }, [name]);

  useEffect(() => {
    void loadEnv();
  }, [loadEnv]);

  useEffect(() => {
    void loadResolved();
  }, [loadResolved]);

  async function saveEnvVar() {
    const key = keyInput.trim();
    if (!key) {
      toast.error('Key is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: name, key, value: valueInput }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = typeof data.error === 'string' ? data.error : 'Failed to save env var';
        toast.error(message);
        return;
      }
      toast.success(`Saved ${key}`);
      setKeyInput('');
      setValueInput('');
      await Promise.all([loadEnv(), loadResolved()]);
    } catch {
      toast.error('Failed to save env var');
    } finally {
      setSaving(false);
    }
  }

  async function deleteEnvVar(key: string) {
    setDeletingKey(key);
    try {
      const res = await fetch(
        `/api/env?agent=${encodeURIComponent(name)}&key=${encodeURIComponent(key)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = typeof data.error === 'string' ? data.error : 'Failed to delete env var';
        toast.error(message);
        return;
      }
      toast.success(`Deleted ${key}`);
      await Promise.all([loadEnv(), loadResolved()]);
    } catch {
      toast.error('Failed to delete env var');
    } finally {
      setDeletingKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">Agent-local Environment Variables</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setReveal((v) => !v)}
              disabled={loadingEnv}
            >
              {reveal ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {reveal ? 'Hide values' : 'Reveal values'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This tab edits only {name}&apos;s .env. Global values are managed from /globals.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              placeholder="KEY"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              aria-label="Env key"
            />
            <Input
              placeholder="Value"
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              aria-label="Env value"
            />
            <Button onClick={() => void saveEnvVar()} disabled={saving} aria-label="Save env variable">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : 'Save'}
            </Button>
          </div>

          {loadingEnv ? (
            <Skeleton className="h-40 w-full" />
          ) : envEntries.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">(empty)</p>
          ) : (
            <div className="rounded-md border">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b bg-muted/30 p-2 text-xs font-medium">
                <span>Key</span>
                <span>Value</span>
                <span className="text-right">Actions</span>
              </div>
              {envEntries.map((entry) => (
                <div key={entry.key} className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b p-2 text-sm last:border-b-0">
                  <span className="font-mono">{entry.key}</span>
                  <span className="font-mono">{entry.value}</span>
                  <div className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => void deleteEnvVar(entry.key)}
                      disabled={deletingKey === entry.key}
                      aria-label={`Delete ${entry.key}`}
                    >
                      {deletingKey === entry.key ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Resolved Environment (Read-only)</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingResolved ? (
            <Skeleton className="h-40 w-full" />
          ) : resolvedEntries.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">(empty)</p>
          ) : (
            <div className="rounded-md border">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b bg-muted/30 p-2 text-xs font-medium">
                <span>Key</span>
                <span>Value</span>
                <span className="text-right">Source</span>
              </div>
              {resolvedEntries.map((entry) => (
                <div key={entry.key} className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b p-2 text-sm last:border-b-0">
                  <span className="font-mono">{entry.key}</span>
                  <span className="font-mono">{entry.value}</span>
                  <span className="text-right text-xs text-muted-foreground">{entry.source}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
