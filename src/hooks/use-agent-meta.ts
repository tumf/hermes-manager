import { type Dispatch, type SetStateAction, useCallback, useState } from 'react';
import { toast } from 'sonner';

interface AgentMeta {
  name: string;
  description: string;
  tags: string[];
  home: string;
}

interface AgentMetaDraft {
  name: string;
  description: string;
  tagsInput: string;
}

interface UseAgentMetaResult {
  meta: AgentMeta | null;
  metaDraft: AgentMetaDraft;
  metaSaving: boolean;
  setMetaDraft: Dispatch<SetStateAction<AgentMetaDraft>>;
  fetchMeta: () => Promise<void>;
  saveMeta: () => Promise<void>;
}

export function useAgentMeta(agentId: string): UseAgentMetaResult {
  const [meta, setMeta] = useState<AgentMeta | null>(null);
  const [metaDraft, setMetaDraft] = useState<AgentMetaDraft>({
    name: '',
    description: '',
    tagsInput: '',
  });
  const [metaSaving, setMetaSaving] = useState(false);

  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) return;
      const agents = (await res.json()) as Array<{
        agentId: string;
        name?: string;
        description?: string;
        tags?: string[];
        home?: string;
      }>;
      const current = agents.find((agent) => agent.agentId === agentId);
      const nextMeta: AgentMeta = {
        name: current?.name ?? '',
        description: current?.description ?? '',
        tags: current?.tags ?? [],
        home: current?.home ?? '',
      };
      setMeta(nextMeta);
      setMetaDraft({
        name: nextMeta.name,
        description: nextMeta.description,
        tagsInput: nextMeta.tags.join(', '),
      });
    } catch {
      // noop
    }
  }, [agentId]);

  const saveMeta = useCallback(async () => {
    setMetaSaving(true);
    try {
      const tags = metaDraft.tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: metaDraft.name.trim(),
          description: metaDraft.description.trim(),
          tags,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(typeof data.error === 'string' ? data.error : 'Failed to update metadata');
        return;
      }

      const updated = (await res.json()) as { name: string; description: string; tags: string[] };
      setMeta({ ...updated, home: meta?.home ?? '' });
      setMetaDraft({
        name: updated.name,
        description: updated.description,
        tagsInput: updated.tags.join(', '),
      });
      toast.success('Agent metadata updated');
    } catch {
      toast.error('Failed to update metadata');
    } finally {
      setMetaSaving(false);
    }
  }, [agentId, meta?.home, metaDraft.description, metaDraft.name, metaDraft.tagsInput]);

  return {
    meta,
    metaDraft,
    metaSaving,
    setMetaDraft,
    fetchMeta,
    saveMeta,
  };
}
