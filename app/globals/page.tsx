'use client';

import { Edit, Plus, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EnvKeyCombobox } from '@/src/components/env-key-combobox';
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
  DialogTrigger,
} from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Skeleton } from '@/src/components/ui/skeleton';

type EnvVisibility = 'plain' | 'secure';

interface EnvRow {
  id: number;
  scope: string;
  key: string;
  value: string;
  visibility: EnvVisibility;
  masked: boolean;
}

function displayValue(row: EnvRow) {
  return row.masked ? '***' : row.value;
}

export default function GlobalsPage() {
  const [rows, setRows] = useState<EnvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [knownSecureValues, setKnownSecureValues] = useState<Record<string, string>>({});

  const fetchRows = useCallback(async () => {
    try {
      const res = await fetch('/api/globals');
      if (!res.ok) {
        throw new Error('Failed to load globals');
      }
      const nextRows = (await res.json()) as EnvRow[];
      setRows(nextRows);
      setKnownSecureValues((prev) => {
        const next = { ...prev };
        for (const row of nextRows) {
          if (row.visibility === 'secure' && row.value !== '***') {
            next[row.key] = row.value;
          }
        }
        return next;
      });
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
      const res = await fetch(`/api/globals?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('delete failed');
      }
      toast.success(`"${key}" deleted`);
      await fetchRows();
    } catch {
      toast.error(`Failed to delete "${key}"`);
    }
  }

  const envPreview = useMemo(
    () =>
      rows
        .map((row) => {
          const runtimeValue =
            row.visibility === 'secure'
              ? (knownSecureValues[row.key] ?? '[secure value hidden]')
              : row.value;
          return `${row.key}=${runtimeValue}`;
        })
        .join('\n'),
    [knownSecureValues, rows],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Global Variables</h1>
        <p className="text-sm text-muted-foreground">
          Environment variables shared across all agents.
        </p>
      </div>

      <AddRowForm
        onAdd={async (key, value, visibility) => {
          try {
            const res = await fetch('/api/globals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key, value, visibility }),
            });
            if (!res.ok) {
              const d = await res.json().catch(() => ({}));
              toast.error(typeof d.error === 'string' ? d.error : 'Failed');
              return;
            }
            if (visibility === 'secure') {
              setKnownSecureValues((prev) => ({ ...prev, [key]: value }));
            }
            toast.success(`"${key}" saved`);
            await fetchRows();
          } catch {
            toast.error('Failed to save variable');
          }
        }}
      />

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

      {!loading && rows.length > 0 && (
        <>
          <div className="space-y-2 md:hidden">
            {rows.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-sm font-medium">{r.key}</div>
                    <div className="truncate font-mono text-xs text-muted-foreground">
                      {displayValue(r)}
                    </div>
                    <div className="mt-1">
                      <Badge variant={r.visibility === 'secure' ? 'secondary' : 'muted'}>
                        {r.visibility}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <EditRowDialog
                      row={r}
                      knownSecureValue={knownSecureValues[r.key]}
                      onSaveSecureValue={(nextValue) => {
                        setKnownSecureValues((prev) => ({ ...prev, [r.key]: nextValue }));
                      }}
                      onSaved={fetchRows}
                    />
                    <DeleteButton keyName={r.key} onDelete={handleDelete} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Key</th>
                  <th className="px-4 py-3 text-left font-medium">Value</th>
                  <th className="px-4 py-3 text-left font-medium">Visibility</th>
                  <th className="w-28 px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-sm font-medium">{r.key}</td>
                    <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                      {displayValue(r)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={r.visibility === 'secure' ? 'secondary' : 'muted'}>
                        {r.visibility}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <EditRowDialog
                      row={r}
                      knownSecureValue={knownSecureValues[r.key]}
                      onSaveSecureValue={(nextValue) => {
                        setKnownSecureValues((prev) => ({ ...prev, [r.key]: nextValue }));
                      }}
                      onSaved={fetchRows}
                    />
                        <DeleteButton keyName={r.key} onDelete={handleDelete} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">.env preview</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                {envPreview}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function AddRowForm({
  onAdd,
}: {
  onAdd: (key: string, value: string, visibility: EnvVisibility) => Promise<void>;
}) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [visibility, setVisibility] = useState<EnvVisibility>('plain');
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
      await onAdd(trimmed, value, visibility);
      setKey('');
      setValue('');
      setVisibility('plain');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="sm:max-w-48">
        <EnvKeyCombobox value={key} onChange={setKey} className="h-11 w-full" />
      </div>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="value"
        aria-label="Variable value"
        className="h-11 font-mono sm:flex-1"
      />
      <select
        className="h-11 rounded-md border border-input bg-background px-3 text-sm"
        value={visibility}
        onChange={(e) => setVisibility(e.target.value as EnvVisibility)}
        aria-label="Visibility"
      >
        <option value="plain">plain</option>
        <option value="secure">secure</option>
      </select>
      <Button type="submit" disabled={busy} className="h-11 gap-2">
        <Plus className="size-4" />
        {busy ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}

function EditRowDialog({
  row,
  knownSecureValue,
  onSaveSecureValue,
  onSaved,
}: {
  row: EnvRow;
  knownSecureValue?: string;
  onSaveSecureValue: (nextValue: string) => void;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [visibility, setVisibility] = useState<EnvVisibility>(row.visibility);
  const [saving, setSaving] = useState(false);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <Edit className="size-4" />
          <span className="sr-only">Edit {row.key}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {row.key}</DialogTitle>
          <DialogDescription>
            Secure values are masked. Enter a new value to change the runtime value.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={row.masked ? 'Enter new value (optional)' : row.value}
          aria-label={`${row.key} value`}
        />
        <select
          className="h-11 rounded-md border border-input bg-background px-3 text-sm"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as EnvVisibility)}
          aria-label="Visibility"
        >
          <option value="plain">plain</option>
          <option value="secure">secure</option>
        </select>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              disabled={saving || (value.length === 0 && visibility === row.visibility)}
              onClick={async () => {
                setSaving(true);
                try {
                  const nextValue =
                    value.length > 0
                      ? value
                      : row.masked
                        ? (knownSecureValue ?? '')
                        : row.value;
                  if (nextValue.length === 0) {
                    toast.error('Secure value is hidden. Enter a new value to update visibility.');
                    return;
                  }

                  const res = await fetch('/api/globals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: row.key, value: nextValue, visibility }),
                  });

                  if (!res.ok) {
                    throw new Error('save failed');
                  }

                  if (visibility === 'secure') {
                    onSaveSecureValue(nextValue);
                  }

                  toast.success(`"${row.key}" updated`);
                  await onSaved();
                } catch {
                  toast.error(`Failed to update "${row.key}"`);
                } finally {
                  setSaving(false);
                }
              }}
            >
              Save
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
