'use client';

import { useCallback, useEffect, useState } from 'react';

import { KeyValueTable, type EnvRow } from '@/src/components/KeyValueTable';

export default function GlobalsPage() {
  const [rows, setRows] = useState<EnvRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    const res = await fetch('/api/globals');
    const data = await res.json();
    setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  if (loading) {
    return <p className="py-4 text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold md:text-2xl">Global Variables</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Variables shared across all agents. Stored in globals/.env and merged at launch time.
        </p>
      </div>

      <div className="space-y-6">
        <KeyValueTable
          title="Variables"
          rows={rows}
          onAdd={async (key, value) => {
            await fetch('/api/globals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key, value }),
            });
            await fetchRows();
          }}
          onEdit={async (row, newKey, newValue) => {
            if (row.key !== newKey) {
              await fetch(`/api/globals?key=${encodeURIComponent(row.key)}`, {
                method: 'DELETE',
              });
            }
            await fetch('/api/globals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: newKey, value: newValue }),
            });
            await fetchRows();
          }}
          onDelete={async (row) => {
            await fetch(`/api/globals?key=${encodeURIComponent(row.key)}`, {
              method: 'DELETE',
            });
            await fetchRows();
          }}
        />

        {rows.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">.env preview</h2>
            <pre className="min-h-[60px] rounded-lg bg-muted px-4 py-3 font-mono text-xs">
              {rows.map((r) => `${r.key}=${r.value}`).join('\n')}
            </pre>
          </div>
        )}
      </div>
    </>
  );
}
