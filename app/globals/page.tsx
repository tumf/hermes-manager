'use client';

import { Plus, Trash2 } from 'lucide-react';
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
import { Input } from '@/src/components/ui/input';
import { Skeleton } from '@/src/components/ui/skeleton';

interface EnvRow {
  id: number;
  scope: string;
  key: string;
  value: string;
}

export default function GlobalsPage() {
  const [rows, setRows] = useState<EnvRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    try {
      const res = await fetch('/api/globals');
      if (res.ok) setRows(await res.json());
    } catch {
      toast.error('Failed to load variables');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  async function handleDelete(key: string) {
    try {
      await fetch(`/api/globals?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      toast.success(`"${key}" deleted`);
      await fetchRows();
    } catch {
      toast.error(`Failed to delete "${key}"`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Global Variables</h1>
        <p className="text-sm text-muted-foreground">
          Environment variables shared across all agents.
        </p>
      </div>

      <AddRowForm
        onAdd={async (key, value) => {
          try {
            const res = await fetch('/api/globals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key, value }),
            });
            if (!res.ok) {
              const d = await res.json().catch(() => ({}));
              toast.error(typeof d.error === 'string' ? d.error : 'Failed');
              return;
            }
            toast.success(`"${key}" added`);
            await fetchRows();
          } catch {
            toast.error('Failed to add variable');
          }
        }}
      />

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 flex-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!loading && rows.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 rounded-full bg-muted p-3">
              <Plus className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No variables yet</p>
            <p className="text-xs text-muted-foreground">
              Add your first environment variable above.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Table - Mobile: stacked cards, Desktop: table */}
      {!loading && rows.length > 0 && (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {rows.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-sm font-medium">{r.key}</div>
                    <div className="truncate font-mono text-xs text-muted-foreground">
                      {r.value}
                    </div>
                  </div>
                  <DeleteButton keyName={r.key} onDelete={handleDelete} />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Key</th>
                  <th className="px-4 py-3 text-left font-medium">Value</th>
                  <th className="w-20 px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-sm font-medium">{r.key}</td>
                    <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{r.value}</td>
                    <td className="px-4 py-3 text-right">
                      <DeleteButton keyName={r.key} onDelete={handleDelete} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* .env preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">.env preview</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                {rows.map((r) => `${r.key}=${r.value}`).join('\n')}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function AddRowForm({ onAdd }: { onAdd: (key: string, value: string) => Promise<void> }) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = key.trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
      toast.error('Invalid key: must match [A-Za-z_][A-Za-z0-9_]*');
      return;
    }
    setBusy(true);
    try {
      await onAdd(trimmed, value);
      setKey('');
      setValue('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="KEY_NAME"
        aria-label="Variable key"
        className="h-11 font-mono sm:max-w-48"
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="value"
        aria-label="Variable value"
        className="h-11 font-mono sm:flex-1"
      />
      <Button type="submit" disabled={busy} className="h-11 gap-2">
        <Plus className="size-4" />
        {busy ? 'Adding...' : 'Add'}
      </Button>
    </form>
  );
}

function DeleteButton({
  keyName,
  onDelete,
}: {
  keyName: string;
  onDelete: (key: string) => Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Delete {keyName}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{keyName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This variable will be removed from all agents that reference it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => void onDelete(keyName)}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
