'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AddAgentDialog, type TemplateEntry } from '@/src/components/add-agent-dialog';
import { type ActionType, type Agent, type AgentWithStatus } from '@/src/components/agent-card';
import { AgentsListContent } from '@/src/components/agents-list-content';
import { useLocale } from '@/src/components/locale-provider';

interface BatchStatusEntry {
  agent: string;
  running: boolean | null;
  error?: string;
}

export default function Home() {
  const { t } = useLocale();
  const [agents, setAgents] = useState<AgentWithStatus[]>([]);
  const [templates, setTemplates] = useState<TemplateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [busyMap, setBusyMap] = useState<Record<string, ActionType>>({});

  const hydrateStatuses = useCallback(async (agentIds: string[]) => {
    if (agentIds.length === 0) {
      return;
    }
    setStatusLoading(true);
    try {
      const res = await fetch('/api/launchd/statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents: agentIds }),
      });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as { statuses?: BatchStatusEntry[] };
      const statuses = data.statuses ?? [];
      const statusMap = new Map<string, BatchStatusEntry>();
      for (const entry of statuses) {
        statusMap.set(entry.agent, entry);
      }
      setAgents((prev) =>
        prev.map((agent) => {
          const entry = statusMap.get(agent.agentId);
          if (!entry) {
            return agent;
          }
          return { ...agent, running: entry.running };
        }),
      );
    } catch {
      // leave agents with previous (or undefined) running state
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('failed to fetch agents');
      const data: Agent[] = await res.json();
      setAgents(data.map((agent) => ({ ...agent, running: undefined })));
      void hydrateStatuses(data.map((agent) => agent.agentId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.agentsList.failedToLoad);
    } finally {
      setLoading(false);
    }
  }, [hydrateStatuses, t]);

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
              : t.agentsList.failedToAction(action, agent.agentId);
        toast.error(message);
        return;
      }
      toast.success(t.agentsList.actionSuccess(agent.agentId, action));
      await fetchAgents();
    } catch {
      toast.error(t.agentsList.failedToAction(action, agent.agentId));
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
      toast.success(t.agentsList.deletedAgent(agentId));
      await fetchAgents();
    } catch {
      toast.error(t.agentsList.failedToDelete(agentId));
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
        toast.error(typeof data.error === 'string' ? data.error : t.agentsList.failedToCopy);
        return;
      }
      const created = await res.json();
      toast.success(t.agentsList.copiedAgent(fromId, created.agentId));
      await fetchAgents();
    } catch {
      toast.error(t.agentsList.failedToCopy);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.agentsList.title}</h1>
          <p className="text-sm text-muted-foreground">{t.agentsList.subtitle}</p>
        </div>
      </div>

      <AddAgentDialog
        templates={templates}
        onOpen={() => void fetchTemplates()}
        onCreated={fetchAgents}
      />

      <AgentsListContent
        loading={loading}
        statusLoading={statusLoading}
        agents={agents}
        busyMap={busyMap}
        onAction={handleStartStop}
        onDelete={handleDelete}
        onCopy={handleCopy}
      />
    </div>
  );
}
