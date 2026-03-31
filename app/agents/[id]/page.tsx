'use client';

import {
  ChevronLeft,
  Clock,
  FileText,
  Loader2,
  Play,
  RotateCcw,
  Save,
  ScrollText,
  Settings,
  Square,
  Undo2,
} from 'lucide-react';
import Link from 'next/link';
import {
  use,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from 'react';
import { toast } from 'sonner';

import { AgentEnvTab } from '@/src/components/agent-env-tab';
import { CodeEditor } from '@/src/components/code-editor';
import { CronTab } from '@/src/components/cron-tab';
import { SkillsTab } from '@/src/components/skills-tab';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/components/ui/alert-dialog';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
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
import { Textarea } from '@/src/components/ui/textarea';

interface AgentPageProps {
  params: Promise<{ id: string }>;
}

export default function AgentPage({ params }: AgentPageProps) {
  const { id: name } = use(params);

  const [status, setStatus] = useState<{
    running: boolean;
    label?: string;
    pid?: number | null;
  } | null>(null);
  const [meta, setMeta] = useState<{
    name: string;
    description: string;
    tags: string[];
    home: string;
  } | null>(null);
  const [metaDraft, setMetaDraft] = useState<{
    name: string;
    description: string;
    tagsInput: string;
  }>({
    name: '',
    description: '',
    tagsInput: '',
  });
  const [metaSaving, setMetaSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      return window.location.hash.slice(1) || 'memory';
    }
    return 'memory';
  });
  const [actionBusy, setActionBusy] = useState<'start' | 'stop' | 'restart' | null>(null);

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

  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) return;
      const agents = (await res.json()) as Array<{
        agentId: string;
        name?: string;
        description?: string;
        tags?: string[];
        home?: string;
      }>;
      const current = agents.find((agent) => agent.agentId === name);
      const nextMeta = {
        name: current?.name ?? '',
        description: current?.description ?? '',
        tags: current?.tags ?? [],
        home: current?.home ?? '',
      };
      setMeta(nextMeta);
      setMetaDraft({
        name: nextMeta.name,
        description: nextMeta.description,
        tagsInput: nextMeta.tags.join(', '),
      });
    } catch {
      // noop
    }
  }, [name]);

  useEffect(() => {
    void Promise.all([fetchStatus(), fetchMeta()]);
  }, [fetchStatus, fetchMeta]);

  async function saveMeta() {
    setMetaSaving(true);
    try {
      const tags = metaDraft.tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      const res = await fetch(`/api/agents/${encodeURIComponent(name)}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: metaDraft.name.trim(),
          description: metaDraft.description.trim(),
          tags,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(typeof data.error === 'string' ? data.error : 'Failed to update metadata');
        return;
      }
      const updated = (await res.json()) as { name: string; description: string; tags: string[] };
      setMeta({ ...updated, home: meta?.home ?? '' });
      setMetaDraft({
        name: updated.name,
        description: updated.description,
        tagsInput: updated.tags.join(', '),
      });
      toast.success('Agent metadata updated');
    } catch {
      toast.error('Failed to update metadata');
    } finally {
      setMetaSaving(false);
    }
  }

  async function handleStartStop(action: 'start' | 'stop' | 'restart') {
    setActionBusy(action);
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
      const labels: Record<string, string> = {
        start: 'started',
        stop: 'stopped',
        restart: 'restarted',
      };
      toast.success(`${name} ${labels[action]}`);
      await fetchStatus();
    } catch {
      toast.error(`Failed to ${action}`);
    } finally {
      setActionBusy(null);
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {meta?.name?.trim() ? (
                <>
                  {meta.name}{' '}
                  <span className="font-mono text-sm font-normal text-muted-foreground">
                    {name}
                  </span>
                </>
              ) : (
                <span className="font-mono">{name}</span>
              )}
            </h1>
            {status?.label && <p className="text-sm text-muted-foreground">{status.label}</p>}
            {meta?.home && (
              <button
                type="button"
                className="inline-flex items-center gap-1 font-mono text-[9px] text-muted-foreground/60 transition-colors hover:text-foreground"
                onClick={() => {
                  void navigator.clipboard.writeText(meta.home);
                  toast.success('Copied HERMES_HOME');
                }}
                title="Click to copy HERMES_HOME"
              >
                {meta.home}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {loading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <>
                <Badge variant={actionBusy ? 'outline' : status?.running ? 'success' : 'muted'}>
                  {actionBusy ? (
                    <Loader2 className="mr-1.5 size-3 animate-spin" />
                  ) : (
                    <span
                      className={`mr-1.5 inline-block size-1.5 rounded-full ${status?.running ? 'bg-green-600 dark:bg-green-400' : 'bg-muted-foreground/50'}`}
                    />
                  )}
                  {actionBusy === 'start'
                    ? 'Starting…'
                    : actionBusy === 'stop'
                      ? 'Stopping…'
                      : actionBusy === 'restart'
                        ? 'Restarting…'
                        : status?.running
                          ? 'Running'
                          : 'Stopped'}
                </Badge>
                {status?.running ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleStartStop('stop')}
                      disabled={actionBusy !== null}
                    >
                      {actionBusy === 'stop' ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Square className="size-3.5" />
                      )}
                      Stop
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleStartStop('restart')}
                      disabled={actionBusy !== null}
                    >
                      {actionBusy === 'restart' ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="size-3.5" />
                      )}
                      Restart
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => void handleStartStop('start')}
                    disabled={actionBusy !== null}
                  >
                    {actionBusy === 'start' ? (
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="meta-name" className="text-sm font-medium">
                  Display Name
                </label>
                <Input
                  id="meta-name"
                  value={metaDraft.name}
                  onChange={(e) => setMetaDraft((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="My Bot"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="meta-tags" className="text-sm font-medium">
                  Tags (comma separated)
                </label>
                <Input
                  id="meta-tags"
                  value={metaDraft.tagsInput}
                  onChange={(e) => setMetaDraft((prev) => ({ ...prev, tagsInput: e.target.value }))}
                  placeholder="prod, monitor"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="meta-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="meta-description"
                value={metaDraft.description}
                onChange={(e) => setMetaDraft((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="用途やメモ"
                rows={3}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void saveMeta()} disabled={metaSaving}>
                {metaSaving ? 'Saving…' : 'Save Metadata'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          window.history.replaceState(null, '', `#${v}`);
        }}
      >
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
          <TabsTrigger value="cron" className="gap-1.5">
            <Clock className="size-3.5" />
            <span className="hidden sm:inline">Cron</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <ScrollText className="size-3.5" />
            <span className="hidden sm:inline">Logs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="memory">
          <MemoryTab name={name} />
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

        <TabsContent value="cron">
          <CronTab name={name} />
        </TabsContent>

        <TabsContent value="logs">
          <LogViewer name={name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Maps file paths to the file names used in the templates API */
const FILE_PATH_TO_TEMPLATE_FILE: Record<string, string> = {
  'AGENTS.md': 'AGENTS.md',
  'SOUL.md': 'SOUL.md',
  'config.yaml': 'config.yaml',
};

const MEMORY_FILES = ['AGENTS.md', 'SOUL.md'] as const;

const FILE_DESCRIPTIONS: Record<string, string> = {
  'AGENTS.md': 'Defines agent behavior, instructions, and capabilities',
  'SOUL.md': "Contains the agent's personality, tone, and communication style",
};

interface MemoryTabProps {
  name: string;
}

function MemoryTab({ name }: MemoryTabProps) {
  const [selectedFile, setSelectedFile] = useState<string>(MEMORY_FILES[0]);
  const [pendingFile, setPendingFile] = useState<string | null>(null);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const editorRef = useRef<FileEditorHandle>(null);

  function handleSwitch(file: string) {
    if (file === selectedFile) return;
    if (editorRef.current?.isDirty()) {
      setPendingFile(file);
      setDiscardDialogOpen(true);
      return;
    }
    setSelectedFile(file);
  }

  function confirmDiscard() {
    setSelectedFile(pendingFile!);
    setPendingFile(null);
    setDiscardDialogOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1">
          {MEMORY_FILES.map((file) => (
            <Button
              key={file}
              variant={selectedFile === file ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleSwitch(file)}
              className="relative"
              aria-pressed={selectedFile === file}
            >
              {editorRef.current?.isDirty() && selectedFile === file && (
                <span
                  className="absolute -right-1 -top-1 size-2 rounded-full bg-orange-400"
                  aria-hidden="true"
                />
              )}
              {file}
            </Button>
          ))}
        </div>
        {selectedFile && FILE_DESCRIPTIONS[selectedFile] && (
          <p className="text-xs text-muted-foreground">{FILE_DESCRIPTIONS[selectedFile]}</p>
        )}
      </div>
      <FileEditor
        key={selectedFile}
        ref={editorRef}
        name={name}
        filePath={selectedFile}
        label={selectedFile}
      />
      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in the current file. Switching tabs will discard your
              changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingFile(null)}>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDiscard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface FileEditorHandle {
  isDirty: () => boolean;
  save: () => void;
}

const FileEditor = forwardRef<FileEditorHandle, { name: string; filePath: string; label: string }>(
  function FileEditor({ name, filePath, label }, ref) {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [savingTemplate, setSavingTemplate] = useState(false);
    const originalRef = useRef('');

    const save = useCallback(async () => {
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
    }, [name, content, filePath, label]);

    useImperativeHandle(
      ref,
      () => ({
        isDirty: () => dirty,
        save,
      }),
      [dirty, save],
    );

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

    useEffect(() => {
      function handleKeyDown(e: KeyboardEvent) {
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
          e.preventDefault();
          if (!saving && dirty && !loading) {
            void save();
          }
        }
      }
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [saving, dirty, loading, save]);

    function handleChange(val: string) {
      setContent(val);
      setDirty(val !== originalRef.current);
    }

    async function saveAsTemplate() {
      const trimmed = templateName.trim();
      if (!trimmed) {
        toast.error('Template name is required');
        return;
      }
      const file = FILE_PATH_TO_TEMPLATE_FILE[filePath];
      if (!file) return;

      setSavingTemplate(true);
      try {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file, name: trimmed, content }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          toast.error(typeof d.error === 'string' ? d.error : 'Failed to save template');
          return;
        }
        toast.success(`Saved as template "${trimmed}"`);
        setSaveAsTemplateOpen(false);
        setTemplateName('');
      } finally {
        setSavingTemplate(false);
      }
    }

    const lineCount = content.split('\n').length;
    const charCount = content.length;

    return (
      <Card className="flex h-[calc(100dvh-14rem)] flex-col">
        <CardHeader className="shrink-0 flex-row items-center justify-between gap-3 pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="font-mono text-xs">{label}</CardTitle>
            {dirty && (
              <span className="text-[10px] text-orange-500" aria-live="polite">
                unsaved
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            <Dialog open={saveAsTemplateOpen} onOpenChange={setSaveAsTemplateOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  className="gap-1.5"
                  onClick={() => setTemplateName('')}
                >
                  <FileText className="size-3.5" />
                  <span className="hidden sm:inline">Template</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save as Template</DialogTitle>
                  <DialogDescription>
                    Save the current content of {label} as a reusable template.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="template-name"
                  aria-label="Template name"
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    onClick={() => void saveAsTemplate()}
                    disabled={savingTemplate || !templateName.trim()}
                  >
                    {savingTemplate ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void save()}
              disabled={saving || loading || !dirty}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : dirty ? (
                <Save className="size-3.5" />
              ) : (
                <Undo2 className="size-3.5 text-muted-foreground" />
              )}
              <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col pt-2">
          {loading ? (
            <Skeleton className="w-full flex-1" />
          ) : (
            <div className="relative flex min-h-0 flex-1 flex-col">
              <CodeEditor
                value={content}
                onChange={handleChange}
                filePath={filePath}
                className="min-h-0 w-full flex-1 overflow-hidden rounded-md border border-input"
                ariaLabel={`Edit ${label}`}
              />
              <div className="mt-1.5 flex items-center justify-end gap-3 text-[10px] text-muted-foreground/70">
                <span>{lineCount} lines</span>
                <span>{charCount.toLocaleString()} chars</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  },
);

// SkillsTab is imported from @/src/components/skills-tab

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
            className="rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed"
          >
            {lines.length ? lines.join('\n') : '(empty)'}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
