'use client';

import { Loader2, Save, Shield } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Skeleton } from '@/src/components/ui/skeleton';

interface AvailableAgent {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

interface DelegationPolicy {
  allowedAgents: string[];
  maxHop: number;
}

interface DelegationTabProps {
  name: string;
}

export function DelegationTab({ name }: DelegationTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([]);
  const [allowedAgents, setAllowedAgents] = useState<Set<string>>(new Set());
  const [maxHop, setMaxHop] = useState(3);
  const [savedPolicy, setSavedPolicy] = useState<DelegationPolicy | null>(null);

  const loadDelegation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(name)}/delegation`);
      if (!res.ok) {
        toast.error('Failed to load dispatch settings');
        return;
      }
      const data = (await res.json()) as {
        policy: DelegationPolicy;
        availableAgents: AvailableAgent[];
      };
      setAvailableAgents(data.availableAgents);
      setAllowedAgents(new Set(data.policy.allowedAgents));
      setMaxHop(data.policy.maxHop);
      setSavedPolicy(data.policy);
    } catch {
      toast.error('Failed to load dispatch settings');
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    void loadDelegation();
  }, [loadDelegation]);

  function toggleAgent(agentId: string, checked: boolean) {
    setAllowedAgents((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(agentId);
      } else {
        next.delete(agentId);
      }
      return next;
    });
  }

  const isDirty =
    savedPolicy !== null &&
    (savedPolicy.maxHop !== maxHop ||
      savedPolicy.allowedAgents.length !== allowedAgents.size ||
      !savedPolicy.allowedAgents.every((a) => allowedAgents.has(a)));

  async function handleSave() {
    setSaving(true);
    try {
      const body: DelegationPolicy = {
        allowedAgents: Array.from(allowedAgents),
        maxHop,
      };
      const res = await fetch(`/api/agents/${encodeURIComponent(name)}/delegation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? 'Failed to save dispatch policy');
        return;
      }
      const data = (await res.json()) as { policy: DelegationPolicy };
      setSavedPolicy(data.policy);
      setAllowedAgents(new Set(data.policy.allowedAgents));
      setMaxHop(data.policy.maxHop);
      toast.success('Dispatch policy saved');
    } catch {
      toast.error('Failed to save dispatch policy');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-4" />
              Subagent Dispatch
            </CardTitle>
            <Button
              size="sm"
              onClick={() => void handleSave()}
              disabled={saving || !isDirty}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure which agents this agent can dispatch tasks to via managed dispatch.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxHop">Max hop count</Label>
            <Input
              id="maxHop"
              type="number"
              min={1}
              max={10}
              value={maxHop}
              onChange={(e) => setMaxHop(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
              className="w-24"
            />
            <p className="text-xs text-muted-foreground">
              Maximum dispatch chain depth before further dispatch is blocked.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Allowed subagents</Label>
            {availableAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No other agents available. Create more agents to enable dispatch.
              </p>
            ) : (
              <div className="space-y-2">
                {availableAgents.map((agent) => (
                  <label
                    key={agent.id}
                    className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={allowedAgents.has(agent.id)}
                      onCheckedChange={(checked) => toggleAgent(agent.id, checked === true)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{agent.name || agent.id}</span>
                        <span className="font-mono text-xs text-muted-foreground">{agent.id}</span>
                      </div>
                      {agent.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {agent.description}
                        </p>
                      )}
                      {agent.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {agent.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {allowedAgents.size > 0 && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs font-medium">Managed dispatch skill</p>
              <p className="text-xs text-muted-foreground">
                The <code className="rounded bg-muted px-1">hermes-manager-subagent-dispatch</code>{' '}
                skill will be auto-equipped when dispatch is enabled.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {allowedAgents.size > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Generated SOUL block preview</CardTitle>
            <p className="text-xs text-muted-foreground">
              This YAML block will be appended to the generated SOUL.md after saving.
            </p>
          </CardHeader>
          <CardContent>
            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
              {buildPreviewBlock(Array.from(allowedAgents), maxHop, availableAgents)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function buildPreviewBlock(
  allowedIds: string[],
  maxHop: number,
  available: AvailableAgent[],
): string {
  const agentMap = new Map(available.map((a) => [a.id, a]));
  const lines: string[] = [
    '<!-- HERMES_MANAGER_SUBAGENTS_V1_BEGIN -->',
    'subagents:',
    '  dispatchSkill: hermes-manager-subagent-dispatch',
    '  directHermesInvocationAllowed: false',
    '  rules:',
    '    onlyListedAgents: true',
    '    forbidRevisitInSameWorkflow: true',
    '    forbidCyclicDispatch: true',
    `    maxHop: ${maxHop}`,
    '  agents:',
  ];
  for (const id of allowedIds) {
    const agent = agentMap.get(id);
    lines.push(`    - id: ${id}`);
    lines.push(`      name: ${agent?.name || id}`);
    lines.push(`      description: ${agent?.description || 'No description'}`);
    if (agent?.tags && agent.tags.length > 0) {
      lines.push('      tags:');
      for (const tag of agent.tags) {
        lines.push(`        - ${tag}`);
      }
    }
  }
  lines.push('<!-- HERMES_MANAGER_SUBAGENTS_V1_END -->');
  return lines.join('\n');
}
