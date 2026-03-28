'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
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

interface Template {
  id: number;
  fileType: string;
  name: string;
  content: string;
  createdAt: string | number;
  updatedAt: string | number;
}

const FILE_TYPES = ['agents.md', 'soul.md', 'config.yaml'] as const;
type FileType = (typeof FILE_TYPES)[number];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [formFileType, setFormFileType] = useState<FileType>('agents.md');
  const [formName, setFormName] = useState('');
  const [formContent, setFormContent] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data: Template[] = await res.json();
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

  function openCreateDialog() {
    setEditing(null);
    setFormFileType('agents.md');
    setFormName('');
    setFormContent('');
    setDialogOpen(true);
  }

  function openEditDialog(tpl: Template) {
    setEditing(tpl);
    setFormFileType(tpl.fileType as FileType);
    setFormName(tpl.name);
    setFormContent(tpl.content);
    setDialogOpen(true);
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
            fileType: formFileType,
            name: trimmedName,
            content: formContent,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          toast.error(typeof d.error === 'string' ? d.error : 'Failed to update');
          return;
        }
        toast.success(`Template "${trimmedName}" updated`);
      } else {
        // Create new
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileType: formFileType,
            name: trimmedName,
            content: formContent,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          toast.error(typeof d.error === 'string' ? d.error : 'Failed to create');
          return;
        }
        toast.success(`Template "${trimmedName}" created`);
      }
      setDialogOpen(false);
      await fetchTemplates();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(tpl: Template) {
    try {
      const res = await fetch(
        `/api/templates?fileType=${encodeURIComponent(tpl.fileType)}&name=${encodeURIComponent(tpl.name)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(typeof d.error === 'string' ? d.error : 'Failed to delete');
        return;
      }
      toast.success(`Template "${tpl.name}" deleted`);
      await fetchTemplates();
    } catch {
      toast.error('Failed to delete template');
    }
  }

  const groupedByFileType = FILE_TYPES.map((ft) => ({
    fileType: ft,
    items: templates.filter((t) => t.fileType === ft),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground">Manage file templates for agent creation.</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="size-4" />
          Add Template
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

      {!loading &&
        groupedByFileType.map(({ fileType, items }) => (
          <div key={fileType} className="space-y-3">
            <h2 className="text-lg font-medium">{fileType}</h2>
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">No templates for {fileType}</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((tpl) => (
                <Card key={tpl.id}>
                  <CardHeader className="flex-row items-center justify-between gap-2">
                    <CardTitle className="text-base">{tpl.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEditDialog(tpl)}
                        aria-label={`Edit ${tpl.name}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            aria-label={`Delete ${tpl.name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete &quot;{tpl.name}&quot; template?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the template.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => void handleDelete(tpl)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                      {tpl.content}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Template' : 'Add Template'}</DialogTitle>
              <DialogDescription>
                {editing
                  ? `Editing template "${editing.name}" for ${editing.fileType}.`
                  : 'Create a new file template for agent creation.'}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="tpl-file-type" className="mb-1.5 block text-sm font-medium">
                  File Type
                </label>
                <Select
                  value={formFileType}
                  onValueChange={(v) => setFormFileType(v as FileType)}
                  disabled={!!editing}
                >
                  <SelectTrigger id="tpl-file-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILE_TYPES.map((ft) => (
                      <SelectItem key={ft} value={ft}>
                        {ft}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="tpl-name" className="mb-1.5 block text-sm font-medium">
                  Name
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
