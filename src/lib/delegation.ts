import fsp from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import { readMetaJson } from './agent-fs';
import { getRuntimeAgentsRootPath } from './runtime-paths';

export const MANAGED_DISPATCH_SKILL = 'hermes-manager-subagent-dispatch';

export const DelegationPolicySchema = z.object({
  allowedAgents: z.array(z.string().min(1)).default([]),
  maxHop: z.number().int().min(1).max(10).default(3),
});

export type DelegationPolicy = z.infer<typeof DelegationPolicySchema>;

export const DEFAULT_POLICY: DelegationPolicy = {
  allowedAgents: [],
  maxHop: 3,
};

export async function readDelegationPolicy(agentHome: string): Promise<DelegationPolicy> {
  const filePath = path.join(agentHome, 'delegation.json');
  try {
    const raw = await fsp.readFile(filePath, 'utf-8');
    const parsed = DelegationPolicySchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    return { ...DEFAULT_POLICY };
  } catch {
    return { ...DEFAULT_POLICY };
  }
}

export async function writeDelegationPolicy(
  agentHome: string,
  policy: DelegationPolicy,
): Promise<void> {
  const filePath = path.join(agentHome, 'delegation.json');
  const tmpPath = `${filePath}.tmp`;
  await fsp.writeFile(tmpPath, JSON.stringify(policy, null, 2), 'utf-8');
  await fsp.rename(tmpPath, filePath);
}

export async function loadAllDelegationEdges(): Promise<Map<string, string[]>> {
  const agentsRoot = getRuntimeAgentsRootPath();
  const edges = new Map<string, string[]>();
  let entries: string[];
  try {
    entries = await fsp.readdir(agentsRoot);
  } catch {
    return edges;
  }
  for (const agentId of entries) {
    const agentHome = path.join(agentsRoot, agentId);
    const stat = await fsp.stat(agentHome).catch(() => null);
    if (!stat?.isDirectory()) continue;
    const policy = await readDelegationPolicy(agentHome);
    if (policy.allowedAgents.length > 0) {
      edges.set(agentId, policy.allowedAgents);
    }
  }
  return edges;
}

export function detectCycle(
  edges: Map<string, string[]>,
  sourceId: string,
  proposed: string[],
): boolean {
  const graph = new Map(edges);
  graph.set(sourceId, proposed);

  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(node: string): boolean {
    if (stack.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    stack.add(node);
    for (const neighbor of graph.get(node) ?? []) {
      if (dfs(neighbor)) return true;
    }
    stack.delete(node);
    return false;
  }

  for (const node of graph.keys()) {
    if (dfs(node)) return true;
  }
  return false;
}

export function validateNoSelfTarget(sourceId: string, allowedAgents: string[]): boolean {
  return !allowedAgents.includes(sourceId);
}

const SOUL_BLOCK_BEGIN = '<!-- HERMES_MANAGER_SUBAGENTS_V1_BEGIN -->';
const SOUL_BLOCK_END = '<!-- HERMES_MANAGER_SUBAGENTS_V1_END -->';

export interface SubagentMeta {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

export function buildSubagentSoulBlock(
  policy: DelegationPolicy,
  targets: SubagentMeta[],
): string {
  if (policy.allowedAgents.length === 0 || targets.length === 0) {
    return '';
  }

  const agentsYaml = targets
    .map((t) => {
      const lines: string[] = [];
      lines.push(`      - id: ${t.id}`);
      lines.push(`        name: ${t.name || t.id}`);
      if (t.description.includes('\n')) {
        lines.push('        description: |-');
        for (const line of t.description.split('\n')) {
          lines.push(`          ${line}`);
        }
      } else {
        lines.push(`        description: ${t.description || 'No description'}`);
      }
      if (t.tags.length > 0) {
        lines.push('        tags:');
        for (const tag of t.tags) {
          lines.push(`          - ${tag}`);
        }
      }
      return lines.join('\n');
    })
    .join('\n');

  return [
    SOUL_BLOCK_BEGIN,
    'subagents:',
    `  dispatchSkill: ${MANAGED_DISPATCH_SKILL}`,
    '  directHermesInvocationAllowed: false',
    '  rules:',
    '    onlyListedAgents: true',
    '    forbidRevisitInSameWorkflow: true',
    '    forbidCyclicDispatch: true',
    `    maxHop: ${policy.maxHop}`,
    '  agents:',
    agentsYaml,
    SOUL_BLOCK_END,
  ].join('\n');
}

export function stripSubagentSoulBlock(content: string): string {
  const beginIdx = content.indexOf(SOUL_BLOCK_BEGIN);
  if (beginIdx === -1) return content;
  const endIdx = content.indexOf(SOUL_BLOCK_END);
  if (endIdx === -1) return content;
  const before = content.slice(0, beginIdx).trimEnd();
  const after = content.slice(endIdx + SOUL_BLOCK_END.length).trimStart();
  return after ? `${before}\n\n${after}` : before;
}

export function injectSubagentSoulBlock(assembled: string, block: string): string {
  const stripped = stripSubagentSoulBlock(assembled);
  if (!block) return stripped;
  return `${stripped}\n\n${block}\n`;
}

export async function resolveTargetMeta(agentIds: string[]): Promise<SubagentMeta[]> {
  const results: SubagentMeta[] = [];
  for (const id of agentIds) {
    const agentHome = getRuntimeAgentsRootPath(id);
    const meta = readMetaJson(agentHome);
    results.push({
      id,
      name: meta.name || id,
      description: meta.description || '',
      tags: meta.tags || [],
    });
  }
  return results;
}

export const DispatchRequestSchema = z.object({
  targetAgent: z.string().min(1),
  message: z.string().min(1).max(4096),
  dispatchPath: z.array(z.string()).default([]),
  hopCount: z.number().int().min(0).default(0),
});

export type DispatchRequest = z.infer<typeof DispatchRequestSchema>;

export function validateDispatch(
  sourceId: string,
  policy: DelegationPolicy,
  request: DispatchRequest,
): { valid: boolean; error?: string } {
  if (!policy.allowedAgents.includes(request.targetAgent)) {
    return { valid: false, error: `target agent "${request.targetAgent}" is not allowed` };
  }
  if (request.dispatchPath.includes(request.targetAgent)) {
    return { valid: false, error: `target agent "${request.targetAgent}" already visited (revisit)` };
  }
  if (request.hopCount >= policy.maxHop) {
    return {
      valid: false,
      error: `hop count ${request.hopCount} would exceed maxHop ${policy.maxHop}`,
    };
  }
  return { valid: true };
}
