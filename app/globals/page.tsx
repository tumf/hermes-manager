'use client';

import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';

interface EnvVar {
  id: number;
  scope: string;
  key: string;
  value: string;
}

const rowSchema = z.object({
  key: z
    .string()
    .min(1, 'Key is required')
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, 'Invalid env var name'),
  value: z.string(),
});

function EnvPreview({ rows }: { rows: EnvVar[] }) {
  const content = rows.length > 0 ? rows.map((r) => `${r.key}=${r.value}`).join('\n') : '';
  return (
    <div className="mt-6">
      <h2 className="text-muted-foreground mb-2 text-sm font-semibold">.env preview</h2>
      <pre className="bg-muted text-foreground min-h-[60px] rounded-md border px-4 py-3 font-mono text-xs">
        {content || <span className="opacity-40"># empty</span>}
      </pre>
    </div>
  );
}

export default function GlobalsPage() {
  const [rows, setRows] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newError, setNewError] = useState('');
  const [adding, setAdding] = useState(false);

  async function fetchRows() {
    const res = await fetch('/api/globals');
    const data = await res.json();
    setRows(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchRows();
  }, []);

  async function handleAdd() {
    const parsed = rowSchema.safeParse({ key: newKey, value: newValue });
    if (!parsed.success) {
      setNewError(parsed.error.errors[0].message);
      return;
    }
    setNewError('');
    const res = await fetch('/api/globals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: newKey, value: newValue }),
    });
    if (res.ok) {
      setNewKey('');
      setNewValue('');
      setAdding(false);
      await fetchRows();
    }
  }

  function startEdit(row: EnvVar) {
    setEditingId(row.id);
    setEditKey(row.key);
    setEditValue(row.value);
    setEditError('');
  }

  async function saveEdit() {
    const parsed = rowSchema.safeParse({ key: editKey, value: editValue });
    if (!parsed.success) {
      setEditError(parsed.error.errors[0].message);
      return;
    }
    setEditError('');
    const row = rows.find((r) => r.id === editingId);
    if (!row) return;
    // Delete old key if renamed, then upsert new
    if (row.key !== editKey) {
      await fetch(`/api/globals?key=${encodeURIComponent(row.key)}`, {
        method: 'DELETE',
      });
    }
    await fetch('/api/globals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: editKey, value: editValue }),
    });
    setEditingId(null);
    await fetchRows();
  }

  async function handleDelete(key: string) {
    await fetch(`/api/globals?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
    await fetchRows();
  }

  if (loading) {
    return <div className="text-muted-foreground p-6 text-sm">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Global Variables</h1>
        <Button size="sm" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-muted-foreground px-4 py-2 text-left font-medium">Key</th>
              <th className="text-muted-foreground px-4 py-2 text-left font-medium">Value</th>
              <th className="w-20 px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {adding && (
              <tr className="border-b">
                <td className="px-4 py-2">
                  <Input
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="KEY_NAME"
                    className="h-8"
                    autoFocus
                  />
                </td>
                <td className="px-4 py-2">
                  <Input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="value"
                    className="h-8"
                  />
                  {newError && <p className="text-destructive mt-1 text-xs">{newError}</p>}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAdd}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setAdding(false);
                        setNewKey('');
                        setNewValue('');
                        setNewError('');
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            )}
            {rows.map((row) =>
              editingId === row.id ? (
                <tr key={row.id} className="border-b">
                  <td className="px-4 py-2">
                    <Input
                      value={editKey}
                      onChange={(e) => setEditKey(e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-8"
                    />
                    {editError && <p className="text-destructive mt-1 text-xs">{editError}</p>}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-mono">{row.key}</td>
                  <td className="text-muted-foreground px-4 py-2 font-mono">{row.value}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => startEdit(row)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive h-7 w-7"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        }
                        title="Delete variable"
                        description={`Delete "${row.key}"? This will update the globals/.env file.`}
                        confirmLabel="Delete"
                        onConfirm={() => handleDelete(row.key)}
                      />
                    </div>
                  </td>
                </tr>
              ),
            )}
            {rows.length === 0 && !adding && (
              <tr>
                <td colSpan={3} className="text-muted-foreground px-4 py-8 text-center">
                  No global variables yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <EnvPreview rows={rows} />
    </div>
  );
}
