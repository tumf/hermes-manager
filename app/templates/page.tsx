'use client';

import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CodeEditor } from '@/src/components/code-editor';
import { useLocale } from '@/src/components/locale-provider';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Skeleton } from '@/src/components/ui/skeleton';

interface TemplateEntry {
  name: string;
  files: string[];
}

const FILE_NAMES = ['AGENTS.md', 'SOUL.md', 'config.yaml'] as const;
type FileName = (typeof FILE_NAMES)[number];

export default function TemplatesPage() {
  const { t } = useLocale();
  const [templates, setTemplates] = useState<TemplateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<{ name: string; file: string; content: string } | null>(
    null,
  );
  const [formFile, setFormFile] = useState<FileName>('AGENTS.md');
  const [formName, setFormName] = useState('');
  const [formContent, setFormContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(
    () => new Set(FILE_NAMES),
  );
  const [initialFormFile, setInitialFormFile] = useState<FileName>('AGENTS.md');
  const [initialFormName, setInitialFormName] = useState('');
  const [initialFormContent, setInitialFormContent] = useState('');

  const contentLineCount = formContent.split('\n').length;
  const contentCharCount = formContent.length;
  const dirty =
    formFile !== initialFormFile ||
    formName !== initialFormName ||
    formContent !== initialFormContent;

  const templatesByFile = useMemo(() => {
    return FILE_NAMES.map((file) => {
      const variants = templates
        .filter((template) => template.files.includes(file))
        .map((template) => template.name)
        .sort((a, b) => a.localeCompare(b));
      return { file, variants };
    }).filter((entry) => entry.variants.length > 0);
  }, [templates]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data: TemplateEntry[] = await res.json();
      setTemplates(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.templates.failedToLoad);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  function toggleExpanded(name: string) {
    setExpandedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function openCreateDialog() {
    setEditing(null);
    setFormFile('AGENTS.md');
    setFormName('');
    setFormContent('');
    setInitialFormFile('AGENTS.md');
    setInitialFormName('');
    setInitialFormContent('');
    setDialogOpen(true);
  }

  async function openEditDialog(templateName: string, file: string) {
    try {
      const res = await fetch(
        `/api/templates?name=${encodeURIComponent(templateName)}&file=${encodeURIComponent(file)}`,
      );
      if (!res.ok) {
        toast.error(t.templates.failedToLoad);
        return;
      }
      const data = await res.json();
      setEditing({ name: templateName, file, content: data.content });
      setFormFile(file as FileName);
      setFormName(templateName);
      setFormContent(data.content);
      setInitialFormFile(file as FileName);
      setInitialFormName(templateName);
      setInitialFormContent(data.content);
      setDialogOpen(true);
    } catch {
      toast.error(t.templates.failedToLoad);
    }
  }

  const persistTemplate = useCallback(async () => {
    const trimmedName = formName.trim();
    if (!trimmedName || !formContent) {
      toast.error(t.templates.nameAndContentRequired);
      return false;
    }

    setBusy(true);
    try {
      if (editing) {
        const res = await fetch('/api/templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: formFile,
            name: trimmedName,
            content: formContent,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          toast.error(typeof d.error === 'string' ? d.error : t.templates.failedToUpdate);
          return false;
        }
        toast.success(t.templates.savedTemplate(trimmedName, formFile));
      } else {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: formFile,
            name: trimmedName,
            content: formContent,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          toast.error(typeof d.error === 'string' ? d.error : t.templates.failedToCreate);
          return false;
        }
        toast.success(t.templates.savedTemplate(trimmedName, formFile));
      }
      setInitialFormFile(formFile);
      setInitialFormName(trimmedName);
      setInitialFormContent(formContent);
      setDialogOpen(false);
      await fetchTemplates();
      return true;
    } finally {
      setBusy(false);
    }
  }, [editing, fetchTemplates, formContent, formFile, formName, t]);

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    await persistTemplate();
  }

  useEffect(() => {
    if (!dialogOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        if (!busy && dirty) {
          void persistTemplate();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dialogOpen, busy, dirty, persistTemplate]);

  async function handleDeleteFile(templateName: string, file: string) {
    try {
      const res = await fetch(
        `/api/templates?name=${encodeURIComponent(templateName)}&file=${encodeURIComponent(file)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(typeof d.error === 'string' ? d.error : t.templates.failedToDelete);
        return;
      }
      toast.success(t.templates.deletedTemplate(templateName, file));
      await fetchTemplates();
    } catch {
      toast.error(t.templates.failedToDelete);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.templates.title}</h1>
          <p className="text-sm text-muted-foreground">
            {t.templates.subtitle.split('runtime/templates/')[0]}
            <code className="text-xs">runtime/templates/</code>
            {t.templates.subtitle.split('runtime/templates/')[1] ?? ''}
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="size-4" />
          {t.templates.addTemplateFile}
        </Button>
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && templates.length === 0 && (
        <p className="text-sm text-muted-foreground">{t.templates.noTemplates}</p>
      )}

      {!loading &&
        templatesByFile.map((group) => (
          <Card key={group.file}>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <button
                className="flex items-center gap-2 text-left"
                onClick={() => toggleExpanded(group.file)}
              >
                {expandedTemplates.has(group.file) ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
                <CardTitle className="font-mono text-base">{group.file}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {t.templates.templateCount(group.variants.length)}
                </span>
              </button>
            </CardHeader>
            {expandedTemplates.has(group.file) && (
              <CardContent className="space-y-2">
                {group.variants.map((templateName) => (
                  <div
                    key={templateName}
                    className="flex items-center justify-between rounded border px-3 py-2"
                  >
                    <span className="text-sm">{templateName}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => void openEditDialog(templateName, group.file)}
                        aria-label={`Edit ${templateName}/${group.file}`}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            aria-label={`Delete ${templateName}/${group.file}`}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t.templates.deleteTitle(templateName, group.file)}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t.templates.deleteDescription}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.templates.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => void handleDeleteFile(templateName, group.file)}
                            >
                              {t.templates.delete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="h-[min(95dvh,56rem)] max-w-6xl">
          <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
            <DialogHeader>
              <DialogTitle>
                {editing ? t.templates.editTemplateFile : t.templates.addTemplateFile}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? t.templates.editDescription(editing.name, editing.file)
                  : t.templates.createDescription}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
              <div className="shrink-0">
                <label htmlFor="tpl-file" className="mb-1.5 block text-sm font-medium">
                  {t.templates.fileLabel}
                </label>
                <Select
                  value={formFile}
                  onValueChange={(v: string) => setFormFile(v as FileName)}
                  disabled={!!editing}
                >
                  <SelectTrigger id="tpl-file">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILE_NAMES.map((fn) => (
                      <SelectItem key={fn} value={fn}>
                        {fn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="shrink-0">
                <label htmlFor="tpl-name" className="mb-1.5 block text-sm font-medium">
                  {t.templates.templateNameLabel}
                </label>
                <Input
                  id="tpl-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="template-name"
                  disabled={!!editing}
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col rounded-md border">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{t.templates.contentLabel}</p>
                    {dirty && (
                      <span className="text-[10px] text-orange-500" aria-live="polite">
                        {t.templates.unsaved}
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground">Markdown / YAML editor</p>
                  </div>
                  <Button type="submit" size="sm" disabled={busy || !dirty} className="gap-1.5">
                    {busy ? t.templates.saving : t.templates.save}
                  </Button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col p-3">
                  <CodeEditor
                    value={formContent}
                    onChange={setFormContent}
                    filePath={formFile}
                    className="min-h-0 w-full flex-1 overflow-hidden rounded-md border border-input"
                    ariaLabel={t.templates.contentLabel}
                  />
                  <div className="mt-1.5 flex items-center justify-end gap-3 text-[10px] text-muted-foreground/70">
                    <span>
                      {contentLineCount} {t.templates.lines}
                    </span>
                    <span>
                      {contentCharCount.toLocaleString()} {t.templates.chars}
                    </span>
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
