'use client';

import {
  Clock,
  File,
  Loader2,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { Skeleton } from '@/src/components/ui/skeleton';

interface CronJob {
  id: string;
  name: string;
  prompt: string;
  skills: string[];
  schedule: {
    kind: string;
    expr: string;
    display?: string;
  };
  state: 'scheduled' | 'paused' | 'completed';
  enabled: boolean;
  created_at?: string;
  next_run_at?: string | null;
  last_run_at?: string | null;
  last_status?: string | null;
  last_error?: string | null;
  deliver?: string;
  repeat?: { times?: number | null; completed?: number };
  model?: string | null;
  provider?: string | null;
}

interface CronTabProps {
  name: string;
}

export function CronTab({ name }: CronTabProps) {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [openJobId, setOpenJobId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cron?agent=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch {
      toast.error('Failed to load cron jobs');
    } finally {
      setLoading(false);
    }
  }, [name]);

  const openJob = openJobId ? jobs.find((j) => j.id === openJobId) ?? null : null;

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const getStateBadge = (job: CronJob) => {
    if (job.state === 'paused') {
      return <Badge variant="outline">paused</Badge>;
    }
    if (job.state === 'completed') {
      return <Badge variant="secondary">completed</Badge>;
    }
    return job.enabled ? (
      <Badge variant="success">active</Badge>
    ) : (
      <Badge variant="muted">disabled</Badge>
    );
  };

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  if (loading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Cron Jobs</h2>
        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
          <Plus className="size-3.5" />
          New Job
        </Button>
      </div>

      {showCreateDialog && (
        <CreateCronJobDialog
          agentName={name}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={fetchJobs}
        />
      )}

      {openJob && (
        <CronJobEditor
          agentName={name}
          job={openJob}
          onClose={() => setOpenJobId(null)}
          onSaved={fetchJobs}
        />
      )}

      <Card>
        <CardContent className="pt-6">
          {jobs.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="mb-4 text-sm text-muted-foreground">No cron jobs yet</p>
              <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                Create your first job
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-semibold">Name</th>
                    <th className="px-3 py-2 text-left font-semibold">Schedule</th>
                    <th className="px-3 py-2 text-left font-semibold">State</th>
                    <th className="px-3 py-2 text-left font-semibold">Next Run</th>
                    <th className="px-3 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b hover:bg-muted/50">
                      <td className="px-3 py-2 font-mono text-xs">
                        <button
                          type="button"
                          onClick={() => setOpenJobId(job.id)}
                          className="text-left underline-offset-2 hover:underline"
                          aria-label={`Open job ${job.name}`}
                        >
                          {job.name}
                        </button>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {job.schedule.display || job.schedule.expr}
                      </td>
                      <td className="px-3 py-2">{getStateBadge(job)}</td>
                      <td className="px-3 py-2 text-xs">{formatDateTime(job.next_run_at)}</td>
                      <td className="px-3 py-2 text-right">
                        <CronJobActions
                          agentName={name}
                          job={job}
                          onRefresh={fetchJobs}
                          onOpen={() => setOpenJobId(job.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateCronJobDialog({
  agentName,
  onClose,
  onSuccess,
}: {
  agentName: string;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState('');
  const [prompt, setPrompt] = useState('');
  const [deliver, setDeliver] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!schedule.trim()) {
      toast.error('Schedule is required');
      return;
    }
    if (!prompt.trim()) {
      toast.error('Prompt is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: agentName,
          name: name.trim() || undefined,
          schedule: schedule.trim(),
          prompt: prompt.trim(),
          deliver: deliver.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to create job');
      }

      toast.success('Job created');
      onClose();
      await onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create job';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="text-sm">Create New Job</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., daily-summary"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">
              Schedule <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="e.g., 0 9 * * * (cron) or 30m (interval)"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Cron: &quot;0 9 * * *&quot; | Interval: &quot;30m&quot;, &quot;2h&quot;,
              &quot;1d&quot;
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">
              Prompt <span className="text-red-500">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="The task for the agent to perform"
              className="min-h-20 w-full resize-y rounded-md border border-input bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">Deliver (optional)</label>
            <input
              type="text"
              value={deliver}
              onChange={(e) => setDeliver(e.target.value)}
              placeholder="e.g., telegram:123456789"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CronJobActions({
  agentName,
  job,
  onRefresh,
  onOpen,
}: {
  agentName: string;
  job: CronJob;
  onRefresh: () => Promise<void>;
  onOpen: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [showOutputViewer, setShowOutputViewer] = useState(false);

  const executeAction = async (action: 'pause' | 'resume' | 'run') => {
    setBusy(true);
    try {
      const res = await fetch('/api/cron/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentName, id: job.id, action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === 'string' ? data.error : `Failed to ${action} job`);
      }

      toast.success(`Job ${action}d`);
      await onRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${action} job`;
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/cron?agent=${encodeURIComponent(agentName)}&id=${encodeURIComponent(job.id)}`,
        {
          method: 'DELETE',
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to delete job');
      }

      toast.success('Job deleted');
      await onRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete job';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {showOutputViewer && (
        <CronOutputViewer
          agentName={agentName}
          job={job}
          onClose={() => setShowOutputViewer(false)}
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MoreVertical className="size-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {job.state !== 'paused' && (
            <DropdownMenuItem onClick={() => void executeAction('pause')}>
              <Pause className="mr-2 size-3.5" />
              Pause
            </DropdownMenuItem>
          )}
          {job.state === 'paused' && (
            <DropdownMenuItem onClick={() => void executeAction('resume')}>
              <Play className="mr-2 size-3.5" />
              Resume
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => void executeAction('run')}>
            <Play className="mr-2 size-3.5" />
            Run Now
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpen}>
            <Pencil className="mr-2 size-3.5" />
            View / Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowOutputViewer(true)}>
            <File className="mr-2 size-3.5" />
            View Output
          </DropdownMenuItem>

          <div className="my-1 border-t" />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => e.preventDefault()}
              >
                <Trash2 className="mr-2 size-3.5" />
                Delete
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete &quot;{job.name}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>
                  This job will be permanently removed. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDelete}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function CronOutputViewer({
  agentName,
  job,
  onClose,
}: {
  agentName: string;
  job: CronJob;
  onClose: () => void;
}) {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    async function loadFiles() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/cron/output?agent=${encodeURIComponent(agentName)}&id=${encodeURIComponent(job.id)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setFiles(data.files || []);
        }
      } catch {
        toast.error('Failed to load output files');
      } finally {
        setLoading(false);
      }
    }
    void loadFiles();
  }, [agentName, job.id]);

  const handleFileSelect = async (fileName: string) => {
    setSelectedFile(fileName);
    setContentLoading(true);
    setFileContent(null);
    try {
      const res = await fetch(
        `/api/cron/output?agent=${encodeURIComponent(agentName)}&id=${encodeURIComponent(job.id)}&file=${encodeURIComponent(fileName)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content);
      }
    } catch {
      toast.error('Failed to load file content');
    } finally {
      setContentLoading(false);
    }
  };

  return (
    <Card className="border-2">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="text-sm">Output: {job.name}</CardTitle>
        <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : files.length === 0 ? (
          <p className="text-sm text-muted-foreground">No output files yet.</p>
        ) : (
          <div className="flex gap-4">
            <div className="w-1/3">
              <p className="mb-2 text-xs font-semibold">Files</p>
              <div className="space-y-1">
                {files.map((file) => (
                  <button
                    key={file}
                    className={`w-full truncate rounded px-2 py-1 text-left font-mono text-xs hover:bg-muted/70 ${selectedFile === file ? 'bg-muted font-semibold' : ''}`}
                    onClick={() => void handleFileSelect(file)}
                  >
                    {file}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              {contentLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : fileContent !== null ? (
                <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-xs">
                  {fileContent}
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground">Select a file to view its content</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CronJobEditor({
  agentName,
  job,
  onClose,
  onSaved,
}: {
  agentName: string;
  job: CronJob;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(job.name);
  const [schedule, setSchedule] = useState(job.schedule.expr);
  const [prompt, setPrompt] = useState(job.prompt);
  const [skills, setSkills] = useState((job.skills || []).join(', '));
  const [deliver, setDeliver] = useState(job.deliver ?? '');
  const [repeatTimes, setRepeatTimes] = useState<string>(
    job.repeat?.times == null ? '' : String(job.repeat.times),
  );
  const [model, setModel] = useState(job.model ?? '');
  const [provider, setProvider] = useState(job.provider ?? '');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleString();
    } catch {
      return '—';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMessage(null);

    if (!schedule.trim()) {
      setErrorMessage('Schedule is required');
      return;
    }
    if (!prompt.trim()) {
      setErrorMessage('Prompt is required');
      return;
    }

    const parsedSkills = skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    let parsedRepeatTimes: number | null = null;
    if (repeatTimes.trim() !== '') {
      const n = Number(repeatTimes);
      if (!Number.isInteger(n) || n <= 0) {
        setErrorMessage('Repeat times must be a positive integer');
        return;
      }
      parsedRepeatTimes = n;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/cron', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: agentName,
          id: job.id,
          name: name.trim(),
          schedule: schedule.trim(),
          prompt: prompt.trim(),
          skills: parsedSkills,
          deliver,
          repeat: { times: parsedRepeatTimes },
          model: model.trim(),
          provider: provider.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          typeof (data as { error?: unknown }).error === 'string'
            ? (data as { error: string }).error
            : 'Failed to save job';
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      toast.success('Job saved');
      await onSaved();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save job';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-2">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="text-sm">Edit Job: {job.name}</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-md border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Runtime metadata
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <dt className="text-muted-foreground">id</dt>
            <dd className="font-mono">{job.id}</dd>
            <dt className="text-muted-foreground">state</dt>
            <dd className="font-mono">{job.state}</dd>
            <dt className="text-muted-foreground">enabled</dt>
            <dd className="font-mono">{String(job.enabled)}</dd>
            <dt className="text-muted-foreground">created_at</dt>
            <dd className="font-mono">{formatDateTime(job.created_at)}</dd>
            <dt className="text-muted-foreground">next_run_at</dt>
            <dd className="font-mono">{formatDateTime(job.next_run_at)}</dd>
            <dt className="text-muted-foreground">last_run_at</dt>
            <dd className="font-mono">{formatDateTime(job.last_run_at)}</dd>
            <dt className="text-muted-foreground">last_status</dt>
            <dd className="font-mono">{job.last_status ?? '—'}</dd>
            <dt className="text-muted-foreground">last_error</dt>
            <dd className="break-all font-mono">{job.last_error ?? '—'}</dd>
          </dl>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cron-edit-name" className="mb-1 block text-xs font-semibold">
              Name
            </label>
            <input
              id="cron-edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="cron-edit-schedule" className="mb-1 block text-xs font-semibold">
              Schedule <span className="text-red-500">*</span>
            </label>
            <input
              id="cron-edit-schedule"
              type="text"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="cron-edit-prompt" className="mb-1 block text-xs font-semibold">
              Prompt <span className="text-red-500">*</span>
            </label>
            <textarea
              id="cron-edit-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-20 w-full resize-y rounded-md border border-input bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="cron-edit-skills" className="mb-1 block text-xs font-semibold">
              Skills (comma separated)
            </label>
            <input
              id="cron-edit-skills"
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g., skill-a, skill-b"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="cron-edit-deliver" className="mb-1 block text-xs font-semibold">
              Deliver
            </label>
            <input
              id="cron-edit-deliver"
              type="text"
              value={deliver}
              onChange={(e) => setDeliver(e.target.value)}
              placeholder="e.g., telegram:123456789"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="cron-edit-repeat-times" className="mb-1 block text-xs font-semibold">
              Repeat times (blank = unlimited)
            </label>
            <input
              id="cron-edit-repeat-times"
              type="number"
              min={1}
              value={repeatTimes}
              onChange={(e) => setRepeatTimes(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cron-edit-model" className="mb-1 block text-xs font-semibold">
                Model
              </label>
              <input
                id="cron-edit-model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g., claude-sonnet-4"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="cron-edit-provider" className="mb-1 block text-xs font-semibold">
                Provider
              </label>
              <input
                id="cron-edit-provider"
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g., anthropic"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {errorMessage && (
            <p role="alert" className="text-xs text-red-600">
              {errorMessage}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
