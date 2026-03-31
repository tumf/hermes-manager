'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AddAgentDialog, type TemplateEntry } from '@/src/components/add-agent-dialog';
import { type ActionType, type Agent, type AgentWithStatus } from '@/src/components/agent-card';
import { AgentsListContent } from '@/src/components/agents-list-content';

export default function Home() {
  const [agents, setAgents] = useState<AgentWithStatus[]>([]);
  const [templates, setTemplates] = useState<TemplateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyMap, setBusyMap] = useState<Record<string, ActionType>>({});

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('failed to fetch agents');
      const data: Agent[] = await res.json();
      const withStatus = await Promise.all(
        data.map(async (agent) => {
          try {
            const statusRes = await fetch('/api/launchd', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ agent: agent.agentId, action: 'status' }),
            });
            if (statusRes.ok) {
              const status = await statusRes.json();
              return { ...agent, running: Boolean(status.running) };
            }
          } catch {
            // non-critical: show stopped
          }
          return { ...agent, running: false };
        }),
      );
      setAgents(withStatus);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) setTemplates(await res.json());
    } catch {
      // non-critical: add dialog still works
    }
  }, []);

  useEffect(() => {
    void fetchAgents();
    void fetchTemplates();
  }, [fetchAgents, fetchTemplates]);

  async function handleStartStop(agent: AgentWithStatus, action: ActionType) {
    setBusyMap((prev) => ({ ...prev, [agent.agentId]: action }));
    try {
      const res = await fetch('/api/launchd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agent.agentId, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          typeof data.error === 'string'
            ? data.error
            : typeof data.stderr === 'string' && data.stderr.trim()
              ? data.stderr.trim()
              : `Failed to ${action} ${agent.agentId}`;
        toast.error(message);
        return;
      }
      toast.success(
        `${agent.agentId} ${{ start: 'started', stop: 'stopped', restart: 'restarted' }[action]}`,
      );
      await fetchAgents();
    } catch {
      toast.error(`Failed to ${action} ${agent.agentId}`);
    } finally {
      setBusyMap((prev) => {
        const next = { ...prev };
        delete next[agent.agentId];
        return next;
      });
    }
  }

  async function handleDelete(agentId: string) {
    try {
      await fetch(`/api/agents?id=${encodeURIComponent(agentId)}&purge=true`, { method: 'DELETE' });
      toast.success(`Agent "${agentId}" deleted`);
      await fetchAgents();
    } catch {
      toast.error(`Failed to delete "${agentId}"`);
    }
  }

  async function handleCopy(fromId: string) {
    try {
      const res = await fetch('/api/agents/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(typeof data.error === 'string' ? data.error : 'Failed to copy');
        return;
      }
      const created = await res.json();
      toast.success(`Copied "${fromId}" → "${created.agentId}"`);
      await fetchAgents();
    } catch {
      toast.error('Failed to copy');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground">Manage your Hermes AI agents.</p>
        </div>
      </div>

      <AddAgentDialog
        templates={templates}
        onOpen={() => void fetchTemplates()}
        onCreated={fetchAgents}
      />

      <AgentsListContent
        loading={loading}
        agents={agents}
        busyMap={busyMap}
        onAction={handleStartStop}
        onDelete={handleDelete}
        onCopy={handleCopy}
      />
    </div>
  );
}
