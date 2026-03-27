'use client';

import {
  ChevronLeft,
  FileText,
  Loader2,
  Play,
  Save,
  ScrollText,
  Settings,
  Square,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';

interface AgentPageProps {
  params: { name: string };
}

const MEMORY_FILES = ['AGENTS.md', 'SOUL.md'] as const;
type MemoryFilePath = (typeof MEMORY_FILES)[number];

export default function AgentPage({ params }: AgentPageProps) {
  const { name } = params;

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
            <span>Env</span>
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-1.5">
            <span>Skills</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <ScrollText className="size-3.5" />
            <span className="hidden sm:inline">Logs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="memory">
          <MemoryEditor name={name} />
        </TabsContent>

        <TabsContent value="config">
          <FileEditor name={name} filePath="config.yaml" label="config.yaml" />
        </TabsContent>

        <TabsContent value="env" forceMount>
          <EnvResolvedViewer name={name} />
        </TabsContent>

        <TabsContent value="skills" forceMount>
          <SkillsLinksViewer name={name} />
        </TabsContent>

        <TabsContent value="logs">
          <LogViewer name={name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MemoryEditor({ name }: { name: string }) {
  const [selectedFile, setSelectedFile] = useState<MemoryFilePath>('AGENTS.md');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleSelectFile = useCallback(
    (nextFile: MemoryFilePath) => {
      if (nextFile === selectedFile) {
        return;
      }

      if (hasUnsavedChanges) {
        const confirmed = window.confirm('未保存の変更があります。破棄してファイルを切り替えますか？');
        if (!confirmed) {
          return;
        }
      }

      setSelectedFile(nextFile);
      setHasUnsavedChanges(false);
    },
    [hasUnsavedChanges, selectedFile],
  );

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm">Memory</CardTitle>
          <div className="flex gap-1">
            {MEMORY_FILES.map((file) => (
              <Button
                key={file}
                type="button"
                variant={selectedFile === file ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 font-mono text-xs"
                onClick={() => handleSelectFile(file)}
              >
                {file}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <FileEditor
          name={name}
          filePath={selectedFile}
          label={selectedFile}
          onDirtyChange={setHasUnsavedChanges}
          cardless
        />
      </CardContent>
    </Card>
  );
}

function FileEditor({
  name,
  filePath,
  label,
  onDirtyChange,
  cardless = false,
}: {
  name: string;
  filePath: string;
  label: string;
  onDirtyChange?: (isDirty: boolean) => void;
  cardless?: boolean;
}) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const originalRef = useRef('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/files?agent=${encodeURIComponent(name)}&path=${encodeURIComponent(filePath)}`,
        );
        if (res.ok) {
          const data = await res.json();
          const text = typeof data === 'string' ? data : (data.content ?? '');
          setContent(text);
          originalRef.current = text;
          setDirty(false);
          onDirtyChange?.(false);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [name, filePath, onDirtyChange]);

  function handleChange(val: string) {
    setContent(val);
    const isDirty = val !== originalRef.current;
    setDirty(isDirty);
    onDirtyChange?.(isDirty);
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
        onDirtyChange?.(false);
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

  const editorArea = loading ? (
    <Skeleton className="h-48 w-full" />
  ) : (
    <textarea
      className="min-h-48 w-full resize-y rounded-md border border-input bg-muted/30 p-3 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      value={content}
      onChange={(e) => handleChange(e.target.value)}
      aria-label={`Edit ${label}`}
    />
  );

  const header = (
    <div className="flex items-center justify-between">
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
    </div>
  );

  if (cardless) {
    return (
      <>
        {header}
        <div className="mt-3">{editorArea}</div>
      </>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">{header}</CardHeader>
      <CardContent>{editorArea}</CardContent>
    </Card>
  );
}

function EnvResolvedViewer({ name }: { name: string }) {
  const [rows, setRows] = useState<Array<{ key: string; value: string; source: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/env/resolved?agent=${encodeURIComponent(name)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message = typeof data.error === 'string' ? data.error : 'Failed to load env';
          toast.error(message);
          return;
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          setRows(data);
        } else {
          setRows([]);
        }
      } catch {
        toast.error('Failed to load env');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [name]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Resolved Env</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No environment variables.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={`${row.key}:${row.source}`}
                className="flex flex-col gap-1 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium">{row.key}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{row.value}</p>
                </div>
                <Badge variant="muted" className="w-fit">
                  {row.source}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SkillsLinksViewer({ name }: { name: string }) {
  const [rows, setRows] = useState<Array<{ id: number; sourcePath: string; targetPath: string; exists: boolean }>>(
    [],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/skills/links?agent=${encodeURIComponent(name)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message = typeof data.error === 'string' ? data.error : 'Failed to load skills links';
          toast.error(message);
          return;
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          setRows(data);
        } else {
          setRows([]);
        }
      } catch {
        toast.error('Failed to load skills links');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [name]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Skill Links</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skill links.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="rounded-md border p-3">
                <p className="truncate font-mono text-xs text-muted-foreground">{row.sourcePath}</p>
                <p className="truncate font-mono text-xs">{row.targetPath}</p>
                <Badge variant={row.exists ? 'success' : 'muted'} className="mt-2">
                  {row.exists ? 'Linked' : 'Missing'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
