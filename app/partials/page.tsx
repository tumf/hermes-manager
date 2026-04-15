'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CodeEditor } from '@/src/components/code-editor';
<<<<<<< Updated upstream
import { useLocale } from '@/src/components/locale-provider';
=======
>>>>>>> Stashed changes
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Skeleton } from '@/src/components/ui/skeleton';

interface PartialRow {
  name: string;
  content: string;
  usedBy: string[];
}

const PARTIAL_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export default function PartialsPage() {
  const { t } = useLocale();
  const [rows, setRows] = useState<PartialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formContent, setFormContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [initialFormName, setInitialFormName] = useState('');
  const [initialFormContent, setInitialFormContent] = useState('');

  const contentLineCount = formContent.split('\n').length;
  const contentCharCount = formContent.length;
  const dirty = formName !== initialFormName || formContent !== initialFormContent;

  const fetchPartials = useCallback(async () => {
    try {
      const response = await fetch('/api/partials');
      if (!response.ok) {
        throw new Error('Failed to load partials');
      }
      const payload = (await response.json()) as PartialRow[];
      setRows(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.partials.failedToSave);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchPartials();
  }, [fetchPartials]);

  function openCreateDialog() {
    setEditingName(null);
    setFormName('');
    setFormContent('');
    setInitialFormName('');
    setInitialFormContent('');
    setDialogOpen(true);
  }

  function openEditDialog(row: PartialRow) {
    setEditingName(row.name);
    setFormName(row.name);
    setFormContent(row.content);
    setInitialFormName(row.name);
    setInitialFormContent(row.content);
    setDialogOpen(true);
  }

  const persistPartial = useCallback(async () => {
    const normalizedName = formName.trim();
    if (!PARTIAL_NAME_PATTERN.test(normalizedName)) {
<<<<<<< Updated upstream
      toast.error(t.partials.invalidName);
=======
      toast.error('Partial name must only contain alphanumeric, underscore, or hyphen');
>>>>>>> Stashed changes
      return false;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/partials', {
        method: editingName ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: normalizedName, content: formContent }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
<<<<<<< Updated upstream
        toast.error(body.error ?? t.partials.failedToSave);
        return false;
      }

      toast.success(t.partials.savedPartial(normalizedName));
=======
        toast.error(body.error ?? 'Failed to save partial');
        return false;
      }

      toast.success(`Saved partial: ${normalizedName}`);
>>>>>>> Stashed changes
      setInitialFormName(normalizedName);
      setInitialFormContent(formContent);
      setDialogOpen(false);
      await fetchPartials();
      return true;
    } finally {
      setSaving(false);
    }
<<<<<<< Updated upstream
  }, [editingName, fetchPartials, formContent, formName, t]);
=======
  }, [editingName, fetchPartials, formContent, formName]);
>>>>>>> Stashed changes

  async function handleSave(event?: React.FormEvent) {
    event?.preventDefault();
    await persistPartial();
  }

  useEffect(() => {
    if (!dialogOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        if (!saving && dirty) {
          void persistPartial();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dialogOpen, saving, dirty, persistPartial]);

  async function handleDelete(name: string) {
    const response = await fetch(`/api/partials?name=${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        usedBy?: string[];
      };
      if (response.status === 409 && Array.isArray(body.usedBy)) {
        toast.error(t.partials.inUseBy(body.usedBy.join(', ')));
      } else {
        toast.error(body.error ?? t.partials.failedToDelete);
      }
      return;
    }

    toast.success(t.partials.deletedPartial(name));
    await fetchPartials();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.partials.title}</h1>
          <p className="text-sm text-muted-foreground">
            {t.partials.subtitle.split('runtime/partials')[0]}
            <code className="text-xs">runtime/partials</code>
            {t.partials.subtitle.split('runtime/partials')[1] ?? ''}
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-1.5">
          <Plus className="size-4" />
          {t.partials.newPartial}
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {!loading && rows.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t.partials.noPartials}
          </CardContent>
        </Card>
      )}

      {!loading &&
        rows.map((row) => (
          <Card key={row.name}>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="font-mono text-base">{row.name}</CardTitle>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {row.usedBy.length === 0 ? (
                    <Badge variant="outline">{t.partials.unused}</Badge>
                  ) : (
                    row.usedBy.map((agentId) => <Badge key={agentId}>{agentId}</Badge>)
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Edit ${row.name}`}
                  onClick={() => openEditDialog(row)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      aria-label={`Delete ${row.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t.partials.deleteTitle(row.name)}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t.partials.deleteDescription}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t.partials.cancel}</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => void handleDelete(row.name)}
                      >
                        {t.partials.delete}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="max-h-48 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs">
                {row.content}
              </pre>
            </CardContent>
          </Card>
        ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="h-[min(95dvh,52rem)] max-w-4xl">
          <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingName ? t.partials.editPartial : t.partials.createPartial}
              </DialogTitle>
              <DialogDescription>
                {editingName
                  ? t.partials.editDescription(editingName)
                  : t.partials.createDescription}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
              <div className="shrink-0">
                <label htmlFor="partial-name" className="mb-1.5 block text-sm font-medium">
                  {t.partials.nameLabel}
                </label>
                <Input
                  id="partial-name"
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  placeholder="directory-structure"
                  disabled={Boolean(editingName)}
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col rounded-md border">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
                  <div>
<<<<<<< Updated upstream
                    <p className="text-sm font-medium">{t.partials.contentLabel}</p>
                    {dirty && (
                      <span className="text-[10px] text-orange-500" aria-live="polite">
                        {t.partials.unsaved}
=======
                    <p className="text-sm font-medium">Content</p>
                    {dirty && (
                      <span className="text-[10px] text-orange-500" aria-live="polite">
                        unsaved
>>>>>>> Stashed changes
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground">Markdown editor</p>
                  </div>
                  <Button type="submit" size="sm" disabled={saving || !dirty} className="gap-1.5">
<<<<<<< Updated upstream
                    {saving ? t.partials.saving : t.partials.save}
=======
                    {saving ? 'Saving...' : 'Save'}
>>>>>>> Stashed changes
                  </Button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col p-3">
                  <CodeEditor
                    value={formContent}
                    onChange={setFormContent}
                    filePath="partial.md"
                    className="min-h-0 w-full flex-1 overflow-hidden rounded-md border border-input"
<<<<<<< Updated upstream
                    ariaLabel={t.partials.contentLabel}
                  />
                  <div className="mt-1.5 flex items-center justify-end gap-3 text-[10px] text-muted-foreground/70">
                    <span>
                      {contentLineCount} {t.partials.lines}
                    </span>
                    <span>
                      {contentCharCount.toLocaleString()} {t.partials.chars}
                    </span>
=======
                    ariaLabel="Content"
                  />
                  <div className="mt-1.5 flex items-center justify-end gap-3 text-[10px] text-muted-foreground/70">
                    <span>{contentLineCount} lines</span>
                    <span>{contentCharCount.toLocaleString()} chars</span>
>>>>>>> Stashed changes
                  </div>
                </div>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
