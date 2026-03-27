'use client';

import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';

const keySchema = z
  .string()
  .min(1, 'Key is required')
  .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, 'Invalid env var name');

export interface EnvRow {
  id: number;
  scope: string;
  key: string;
  value: string;
}

interface KeyValueTableProps {
  title: string;
  rows: EnvRow[];
  showSource?: boolean;
  onAdd: (key: string, value: string) => Promise<void>;
  onEdit?: (row: EnvRow, newKey: string, newValue: string) => Promise<void>;
  onDelete: (row: EnvRow) => Promise<void>;
}

export function KeyValueTable({
  title,
  rows,
  showSource,
  onAdd,
  onEdit,
  onDelete,
}: KeyValueTableProps) {
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newError, setNewError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState('');

  async function handleAdd() {
    const parsed = keySchema.safeParse(newKey);
    if (!parsed.success) {
      setNewError(parsed.error.errors[0].message);
      return;
    }
    setNewError('');
    await onAdd(newKey, newValue);
    setNewKey('');
    setNewValue('');
    setAdding(false);
  }

  function startEdit(row: EnvRow) {
    setEditingId(row.id);
    setEditKey(row.key);
    setEditValue(row.value);
    setEditError('');
  }

  async function saveEdit() {
    const parsed = keySchema.safeParse(editKey);
    if (!parsed.success) {
      setEditError(parsed.error.errors[0].message);
      return;
    }
    setEditError('');
    const row = rows.find((r) => r.id === editingId);
    if (!row || !onEdit) return;
    await onEdit(row, editKey, editValue);
    setEditingId(null);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button size="sm" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
                {showSource && <TableHead>Source</TableHead>}
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {adding && (
                <TableRow>
                  <TableCell>
                    <Input
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder="KEY_NAME"
                      className="h-8"
                      autoFocus
                      aria-label="New variable key"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="value"
                      className="h-8"
                      aria-label="New variable value"
                    />
                    {newError && (
                      <p className="mt-1 text-xs text-destructive" aria-live="polite">
                        {newError}
                      </p>
                    )}
                  </TableCell>
                  {showSource && <TableCell />}
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={handleAdd}
                        aria-label="Save"
                      >
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
                        aria-label="Cancel"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) =>
                editingId === row.id ? (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Input
                        value={editKey}
                        onChange={(e) => setEditKey(e.target.value)}
                        className="h-8"
                        autoFocus
                        aria-label="Edit key"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8"
                        aria-label="Edit value"
                      />
                      {editError && (
                        <p className="mt-1 text-xs text-destructive" aria-live="polite">
                          {editError}
                        </p>
                      )}
                    </TableCell>
                    {showSource && <TableCell />}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={saveEdit}
                          aria-label="Save"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setEditingId(null)}
                          aria-label="Cancel"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">{row.key}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {row.value}
                    </TableCell>
                    {showSource && (
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {row.scope}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex gap-1">
                        {onEdit && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => startEdit(row)}
                            aria-label={`Edit ${row.key}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        <ConfirmDialog
                          trigger={
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              aria-label={`Delete ${row.key}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          }
                          title="Delete variable"
                          description={`Delete "${row.key}"? This cannot be undone.`}
                          confirmLabel="Delete"
                          onConfirm={() => onDelete(row)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ),
              )}
              {rows.length === 0 && !adding && (
                <TableRow>
                  <TableCell
                    colSpan={showSource ? 4 : 3}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No variables yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
