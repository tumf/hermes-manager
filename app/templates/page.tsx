'use client';

import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
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
import { Textarea } from '@/src/components/ui/textarea';

interface TemplateEntry {
  name: string;
  files: string[];
}

const FILE_NAMES = ['AGENTS.md', 'SOUL.md', 'config.yaml'] as const;
type FileName = (typeof FILE_NAMES)[number];

export default function TemplatesPage() {
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
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data: TemplateEntry[] = await res.json();
      setTemplates(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

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
    setDialogOpen(true);
  }

  async function openEditDialog(templateName: string, file: string) {
    try {
      const res = await fetch(
        `/api/templates?name=${encodeURIComponent(templateName)}&file=${encodeURIComponent(file)}`,
      );
      if (!res.ok) {
        toast.error('Failed to load template file');
        return;
      }
      const data = await res.json();
      setEditing({ name: templateName, file, content: data.content });
      setFormFile(file as FileName);
      setFormName(templateName);
      setFormContent(data.content);
      setDialogOpen(true);
    } catch {
      toast.error('Failed to load template file');
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = formName.trim();
    if (!trimmedName || !formContent) {
      toast.error('Name and content are required');
      return;
    }

    setBusy(true);
    try {
      if (editing) {
        // Update existing
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
          toast.error(typeof d.error === 'string' ? d.error : 'Failed to update');
          return;
        }
        toast.success(`Template "${trimmedName}/${formFile}" updated`);
      } else {
        // Create new
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
          toast.error(typeof d.error === 'string' ? d.error : 'Failed to create');
          return;
        }
        toast.success(`Template "${trimmedName}/${formFile}" created`);
      }
      setDialogOpen(false);
      await fetchTemplates();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteFile(templateName: string, file: string) {
    try {
      const res = await fetch(
        `/api/templates?name=${encodeURIComponent(templateName)}&file=${encodeURIComponent(file)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(typeof d.error === 'string' ? d.error : 'Failed to delete');
        return;
      }
      toast.success(`Template file "${templateName}/${file}" deleted`);
      await fetchTemplates();
    } catch {
      toast.error('Failed to delete template file');
    }
  }

  async function handleDeleteTemplate(templateName: string) {
    try {
      const res = await fetch(`/api/templates?name=${encodeURIComponent(templateName)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(typeof d.error === 'string' ? d.error : 'Failed to delete');
        return;
      }
      toast.success(`Template "${templateName}" deleted`);
      await fetchTemplates();
    } catch {
      toast.error('Failed to delete template');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Manage file templates for agent creation. Templates are stored in{' '}
            <code className="text-xs">runtime/templates/</code>.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="size-4" />
          Add Template File
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
        <p className="text-sm text-muted-foreground">No templates found.</p>
      )}

      {!loading &&
        templates.map((tpl) => (
          <Card key={tpl.name}>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <button
                className="flex items-center gap-2 text-left"
                onClick={() => toggleExpanded(tpl.name)}
              >
                {expandedTemplates.has(tpl.name) ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
                <CardTitle className="text-base">{tpl.name}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  ({tpl.files.length} file{tpl.files.length !== 1 ? 's' : ''})
                </span>
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    aria-label={`Delete template ${tpl.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete &quot;{tpl.name}&quot; template?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all files in this template.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => void handleDeleteTemplate(tpl.name)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardHeader>
            {expandedTemplates.has(tpl.name) && (
              <CardContent className="space-y-2">
                {tpl.files.map((file) => (
                  <div
                    key={file}
                    className="flex items-center justify-between rounded border px-3 py-2"
                  >
                    <span className="font-mono text-sm">{file}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => void openEditDialog(tpl.name, file)}
                        aria-label={`Edit ${tpl.name}/${file}`}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            aria-label={`Delete ${tpl.name}/${file}`}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete &quot;{tpl.name}/{file}&quot;?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this template file.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => void handleDeleteFile(tpl.name, file)}
                            >
                              Delete
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Template File' : 'Add Template File'}</DialogTitle>
              <DialogDescription>
                {editing
                  ? `Editing "${editing.name}/${editing.file}".`
                  : 'Create a new file template for agent creation.'}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="tpl-file" className="mb-1.5 block text-sm font-medium">
                  File
                </label>
                <Select
                  value={formFile}
                  onValueChange={(v) => setFormFile(v as FileName)}
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
              <div>
                <label htmlFor="tpl-name" className="mb-1.5 block text-sm font-medium">
                  Template Name
                </label>
                <Input
                  id="tpl-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="template-name"
                  disabled={!!editing}
                />
              </div>
              <div>
                <label htmlFor="tpl-content" className="mb-1.5 block text-sm font-medium">
                  Content
                </label>
                <Textarea
                  id="tpl-content"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Template content..."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={busy || !formName.trim()}>
                {busy ? 'Saving...' : editing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
