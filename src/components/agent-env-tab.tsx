'use client';

import { Plus, Settings, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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

interface AgentEnvRow {
  key: string;
  value: string;
  masked: boolean;
  visibility: EnvVisibility;
}

export function AgentEnvTab({ name }: { name: string }) {
  const [rows, setRows] = useState<AgentEnvRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    try {
      const res = await fetch(`/api/env?agent=${encodeURIComponent(name)}`);
      if (!res.ok) {
        throw new Error('failed to fetch env rows');
      }
      setRows(await res.json());
    } catch {
      toast.error('Failed to load env vars');
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  async function handleDelete(key: string) {
    try {
      const res = await fetch(
        `/api/env?agent=${encodeURIComponent(name)}&key=${encodeURIComponent(key)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        throw new Error('delete failed');
      }
      toast.success(`Deleted ${key}`);
      await fetchRows();
    } catch {
      toast.error(`Failed to delete ${key}`);
    }
  }

  if (loading) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <div className="space-y-4">
      <AgentEnvAddForm agentName={name} onSaved={fetchRows} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Environment variables</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No env vars yet.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-sm font-medium">{row.key}</div>
                    <div className="truncate font-mono text-xs text-muted-foreground">
                      {row.masked ? '***' : row.value}
                    </div>
                    <Badge variant={row.visibility === 'secure' ? 'secondary' : 'muted'}>
                      {row.visibility}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <AgentEnvEditDialog agentName={name} row={row} onSaved={fetchRows} />
                    <AgentEnvDeleteButton keyName={row.key} onDelete={handleDelete} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AgentEnvAddForm({
  agentName,
  onSaved,
}: {
  agentName: string;
  onSaved: () => Promise<void>;
}) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [visibility, setVisibility] = useState<EnvVisibility>('plain');
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={async (e) => {
        e.preventDefault();
        const trimmed = key.trim();
        if (!trimmed) {
          toast.error('Key is required');
          return;
        }

        setSaving(true);
        try {
          const res = await fetch('/api/env', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent: agentName, key: trimmed, value, visibility }),
          });
          if (!res.ok) {
            throw new Error('save failed');
          }
          setKey('');
          setValue('');
          setVisibility('plain');
          toast.success(`Saved ${trimmed}`);
          await onSaved();
        } catch {
          toast.error('Failed to save env var');
        } finally {
          setSaving(false);
        }
      }}
    >
      <EnvKeyCombobox value={key} onChange={setKey} />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="value"
        aria-label="Env value"
        className="h-10 font-mono sm:flex-1"
      />
      <select
        value={visibility}
        onChange={(e) => setVisibility(e.target.value as EnvVisibility)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        aria-label="Visibility"
      >
        <option value="plain">plain</option>
        <option value="secure">secure</option>
      </select>
      <Button type="submit" disabled={saving} className="h-10 gap-1.5">
        <Plus className="size-3.5" />
        {saving ? 'Saving...' : 'Add'}
      </Button>
    </form>
  );
}

function AgentEnvEditDialog({
  agentName,
  row,
  onSaved,
}: {
  agentName: string;
  row: AgentEnvRow;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [visibility, setVisibility] = useState<EnvVisibility>(row.visibility);
  const [saving, setSaving] = useState(false);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <Settings className="size-4" />
          <span className="sr-only">Edit {row.key}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {row.key}</DialogTitle>
          <DialogDescription>Update value and visibility.</DialogDescription>
        </DialogHeader>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={row.masked ? 'Enter new value (optional)' : row.value}
          aria-label={`${row.key} value`}
        />
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as EnvVisibility)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
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
                  const payload: {
                    agent: string;
                    key: string;
                    visibility: EnvVisibility;
                    value?: string;
                  } = {
                    agent: agentName,
                    key: row.key,
                    visibility,
                  };
                  if (value.length > 0) {
                    payload.value = value;
                  }

                  const res = await fetch('/api/env', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });
                  if (!res.ok) {
                    throw new Error('save failed');
                  }
                  toast.success(`Updated ${row.key}`);
                  await onSaved();
                } catch {
                  toast.error(`Failed to update ${row.key}`);
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

function AgentEnvDeleteButton({
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
            This variable will be removed from the current agent.
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
