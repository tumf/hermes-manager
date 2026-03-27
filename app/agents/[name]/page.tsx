'use client';

import { ChevronLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { KeyValueTable, type EnvRow } from '@/src/components/KeyValueTable';
import { LogViewer } from '@/src/components/LogViewer';
import { SkillsTree } from '@/src/components/SkillsTree';
import { StatusBadge } from '@/src/components/StatusBadge';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';

interface AgentPageProps {
  params: Promise<{ name: string }>;
}

function FileEditor({
  label,
  agentName,
  filePath,
}: {
  label: string;
  agentName: string;
  filePath: string;
}) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/files?agent=${encodeURIComponent(agentName)}&path=${encodeURIComponent(filePath)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setContent(typeof data === 'string' ? data : (data.content ?? ''));
        }
      } catch {
        // ignore load errors
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [agentName, filePath]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentName, path: filePath, content }),
      });
      if (res.ok) {
        toast.success(`${filePath} saved`);
      } else {
        toast.error(`Failed to save ${filePath}`);
      }
    } catch {
      toast.error(`Failed to save ${filePath}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm">{label}</CardTitle>
        <Button size="sm" onClick={handleSave} disabled={saving || loading}>
          <Save className="mr-1 h-3 w-3" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </CardHeader>
      <CardContent>
        <textarea
          className="min-h-48 w-full resize-y rounded-md border bg-muted p-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={loading}
          aria-label={`Edit ${filePath}`}
        />
      </CardContent>
    </Card>
  );
}

function OverviewTab({ agentName }: { agentName: string }) {
  const [running, setRunning] = useState<boolean | null>(null);
  const [label, setLabel] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, agentsRes] = await Promise.all([
        fetch('/api/launchd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: agentName, action: 'status' }),
        }),
        fetch('/api/agents'),
      ]);
      if (statusRes.ok) {
        const s = await statusRes.json();
        setRunning(s.running ?? false);
        setLabel(s.label ?? '');
      }
      if (agentsRes.ok) {
        const agents = await agentsRes.json();
        const agent = agents.find((a: { name: string }) => a.name === agentName);
        if (agent) setEnabled(agent.enabled);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [agentName]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  async function handleStartStop(action: 'start' | 'stop') {
    await fetch('/api/launchd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: agentName, action }),
    });
    toast.success(`Agent ${action === 'start' ? 'started' : 'stopped'}`);
    void fetchStatus();
  }

  if (loading) {
    return <p className="py-4 text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status</span>
          <StatusBadge status={running ? 'running' : 'stopped'} />
        </div>
        {label && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Launchd Label</span>
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Enabled</span>
          <span className="text-sm text-muted-foreground">{enabled ? 'Yes' : 'No'}</span>
        </div>
        <div className="pt-2">
          {running ? (
            <Button variant="outline" onClick={() => handleStartStop('stop')}>
              Stop Agent
            </Button>
          ) : (
            <Button onClick={() => handleStartStop('start')}>Start Agent</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EnvTab({ agentName }: { agentName: string }) {
  const [rows, setRows] = useState<EnvRow[]>([]);
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchEnv = useCallback(async () => {
    try {
      const [envRes, resolvedRes] = await Promise.all([
        fetch(`/api/env?agent=${encodeURIComponent(agentName)}`),
        fetch(`/api/env/resolved?agent=${encodeURIComponent(agentName)}`),
      ]);
      if (envRes.ok) setRows(await envRes.json());
      if (resolvedRes.ok) setResolved(await resolvedRes.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [agentName]);

  useEffect(() => {
    void fetchEnv();
  }, [fetchEnv]);

  if (loading) {
    return <p className="py-4 text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      <KeyValueTable
        title="Environment Variables"
        rows={rows}
        showSource
        onAdd={async (key, value) => {
          await fetch('/api/env', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent: agentName, key, value }),
          });
          void fetchEnv();
        }}
        onEdit={async (row, newKey, newValue) => {
          if (row.key !== newKey) {
            await fetch(
              `/api/env?agent=${encodeURIComponent(agentName)}&key=${encodeURIComponent(row.key)}`,
              {
                method: 'DELETE',
              },
            );
          }
          await fetch('/api/env', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent: agentName, key: newKey, value: newValue }),
          });
          void fetchEnv();
        }}
        onDelete={async (row) => {
          await fetch(
            `/api/env?agent=${encodeURIComponent(agentName)}&key=${encodeURIComponent(row.key)}`,
            {
              method: 'DELETE',
            },
          );
          void fetchEnv();
        }}
      />

      {Object.keys(resolved).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Resolved Environment</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="rounded-lg bg-muted p-3 font-mono text-xs">
              {Object.entries(resolved)
                .map(([k, v]) => `${k}=${v}`)
                .join('\n')}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AgentPage({ params }: AgentPageProps) {
  const { name } = use(params);

  return (
    <>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-xl font-bold md:text-2xl">{name}</h1>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4 flex w-full flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="env">Env</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab agentName={name} />
        </TabsContent>

        <TabsContent value="memory">
          <div className="grid gap-4 md:grid-cols-2">
            <FileEditor label="AGENTS.md" agentName={name} filePath="AGENTS.md" />
            <FileEditor label="SOUL.md" agentName={name} filePath="SOUL.md" />
          </div>
        </TabsContent>

        <TabsContent value="config">
          <FileEditor label="config.yaml" agentName={name} filePath="config.yaml" />
        </TabsContent>

        <TabsContent value="env">
          <EnvTab agentName={name} />
        </TabsContent>

        <TabsContent value="skills">
          <SkillsTree agentName={name} />
        </TabsContent>

        <TabsContent value="logs">
          <LogViewer agentName={name} />
        </TabsContent>
      </Tabs>
    </>
  );
}
