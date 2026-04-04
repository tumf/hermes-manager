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
} from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Textarea } from '@/src/components/ui/textarea';

interface PartialRow {
  name: string;
  content: string;
  usedBy: string[];
}

const PARTIAL_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export default function PartialsPage() {
  const [rows, setRows] = useState<PartialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formContent, setFormContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPartials = useCallback(async () => {
    try {
      const response = await fetch('/api/partials');
      if (!response.ok) {
        throw new Error('Failed to load partials');
      }
      const payload = (await response.json()) as PartialRow[];
      setRows(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load partials');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPartials();
  }, [fetchPartials]);

  function openCreateDialog() {
    setEditingName(null);
    setFormName('');
    setFormContent('');
    setDialogOpen(true);
  }

  function openEditDialog(row: PartialRow) {
    setEditingName(row.name);
    setFormName(row.name);
    setFormContent(row.content);
    setDialogOpen(true);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();

    const normalizedName = formName.trim();
    if (!PARTIAL_NAME_PATTERN.test(normalizedName)) {
      toast.error('Partial name must only contain alphanumeric, underscore, or hyphen');
      return;
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
        toast.error(body.error ?? 'Failed to save partial');
        return;
      }

      toast.success(
        editingName ? `Updated partial: ${normalizedName}` : `Created partial: ${normalizedName}`,
      );
      setDialogOpen(false);
      await fetchPartials();
    } finally {
      setSaving(false);
    }
  }

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
        toast.error(`Partial is in use by: ${body.usedBy.join(', ')}`);
      } else {
        toast.error(body.error ?? 'Failed to delete partial');
      }
      return;
    }

    toast.success(`Deleted partial: ${name}`);
    await fetchPartials();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Partials</h1>
          <p className="text-sm text-muted-foreground">
            Manage shared SOUL partials stored under{' '}
            <code className="text-xs">runtime/partials</code>.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-1.5">
          <Plus className="size-4" />
          New Partial
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
            No partials found.
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
                    <Badge variant="outline">unused</Badge>
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
                      <AlertDialogTitle>Delete partial &quot;{row.name}&quot;?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the shared partial file. Deletion is blocked if any agent
                        currently uses it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => void handleDelete(row.name)}
                      >
                        Delete
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
        <DialogContent>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingName ? 'Edit partial' : 'Create partial'}</DialogTitle>
              <DialogDescription>
                {editingName
                  ? `Update content for partial "${editingName}".`
                  : 'Create a reusable SOUL partial snippet.'}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="partial-name" className="mb-1.5 block text-sm font-medium">
                  Name
                </label>
                <Input
                  id="partial-name"
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  placeholder="directory-structure"
                  disabled={Boolean(editingName)}
                />
              </div>
              <div>
                <label htmlFor="partial-content" className="mb-1.5 block text-sm font-medium">
                  Content
                </label>
                <Textarea
                  id="partial-content"
                  value={formContent}
                  onChange={(event) => setFormContent(event.target.value)}
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
              <Button type="submit" disabled={saving || !formName.trim()}>
                {saving ? 'Saving...' : editingName ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
