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
import { CronTab } from '@/src/components/cron-tab';
import { SkillsTab } from '@/src/components/skills-tab';
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

interface AgentPageProps {
  params: Promise<{ id: string }>;
}

export default function AgentPage({ params }: AgentPageProps) {
  const { id: name } = use(params);

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

  async function handleStartStop(action: 'start' | 'stop' | 'restart') {
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
                <>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleStartStop('restart')}
                    disabled={actionBusy}
                  >
                    {actionBusy ? (
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

const FILE_PATH_TO_FILE_TYPE: Record<string, string> = {
  'AGENTS.md': 'agents.md',
  'SOUL.md': 'soul.md',
  'config.yaml': 'config.yaml',
};

const MEMORY_FILES = ['AGENTS.md', 'SOUL.md'] as const;

function MemoryTab({ name }: { name: string }) {
  const [selectedFile, setSelectedFile] = useState<string>(MEMORY_FILES[0]);
  const editorRef = useRef<FileEditorHandle>(null);

  function handleSwitch(file: string) {
    if (file === selectedFile) return;
    if (editorRef.current?.isDirty()) {
      const confirmed = window.confirm('You have unsaved changes. Discard and switch?');
      if (!confirmed) return;
    }
    setSelectedFile(file);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {MEMORY_FILES.map((file) => (
          <Button
            key={file}
            variant={selectedFile === file ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleSwitch(file)}
          >
            {file}
          </Button>
        ))}
      </div>
      <FileEditor
        key={selectedFile}
        ref={editorRef}
        name={name}
        filePath={selectedFile}
        label={selectedFile}
      />
    </div>
  );
}

interface FileEditorHandle {
  isDirty: () => boolean;
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

    useImperativeHandle(
      ref,
      () => ({
        isDirty: () => dirty,
      }),
      [dirty],
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

    async function saveAsTemplate() {
      const trimmed = templateName.trim();
      if (!trimmed) {
        toast.error('Template name is required');
        return;
      }
      const fileType = FILE_PATH_TO_FILE_TYPE[filePath];
      if (!fileType) return;

      setSavingTemplate(true);
      try {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileType, name: trimmed, content }),
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

    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-mono text-xs">{label}</CardTitle>
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
                  Save as Template
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
              ) : (
                <Save className="size-3.5" />
              )}
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
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
            className="max-h-96 overflow-y-auto rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed"
          >
            {lines.length ? lines.join('\n') : '(empty)'}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
