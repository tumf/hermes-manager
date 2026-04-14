import fsp from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import { readMetaJson } from './agent-fs';
import { getRuntimeAgentsRootPath } from './runtime-paths';

export const MANAGED_DISPATCH_SKILL = 'hermes-manager-subagent-dispatch';
export const MANAGED_DISPATCH_SCRIPT_NAME = 'dispatch-subagent.sh';

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

export function buildSubagentSoulBlock(policy: DelegationPolicy, targets: SubagentMeta[]): string {
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
    'Use listed subagents when they can handle part of the task more efficiently than doing everything yourself.',
    '',
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

export function buildManagedDispatchSkillContent(): string {
  return [
    '---',
    `name: ${MANAGED_DISPATCH_SKILL}`,
    'description: Manager-owned dispatch skill for calling only policy-approved subagents through Hermes Manager.',
    'version: 1.0.0',
    'author: Hermes Manager',
    'license: Proprietary',
    'metadata:',
    '  hermes:',
    '    tags: [manager, delegation, subagent, dispatch]',
    '    managed: true',
    '---',
    '',
    '# Hermes Manager Subagent Dispatch',
    '',
    'Use this skill when you need another managed agent to handle a focused sub-task.',
    '',
    '## Rules',
    '',
    '- Only delegate to agents listed in the machine-generated `subagents` block in your current `SOUL.md`.',
    `- Use the bundled sibling script \`${MANAGED_DISPATCH_SCRIPT_NAME}\` for cross-agent delegation.`,
    '- Never invoke another agent directly with raw `hermes chat`.',
    '- Use listed subagents proactively when they can complete part of the work more efficiently than doing everything yourself.',
    '- Do not delegate if no listed subagent is a clear fit for the task.',
    '- Keep delegated requests narrow, explicit, and reviewable.',
    '',
    '## Read from SOUL.md first',
    '',
    'Inspect the block between `<!-- HERMES_MANAGER_SUBAGENTS_V1_BEGIN -->` and `<!-- HERMES_MANAGER_SUBAGENTS_V1_END -->`.',
    'Use it as the source of truth for:',
    '',
    '- `dispatchSkill`',
    '- `rules.maxHop`',
    '- `agents[].id`',
    '- `agents[].name`',
    '- `agents[].description`',
    '- `agents[].tags`',
    '',
    '## Dispatch procedure',
    '',
    '1. Check whether any listed subagent can handle part of the task more efficiently than doing all work yourself.',
    '2. If yes, choose exactly one listed subagent that best matches that slice of work.',
    '3. Write a focused request with goal, context, constraints, and expected output.',
    `4. Pipe that request into the bundled sibling script \`${MANAGED_DISPATCH_SCRIPT_NAME} <target-agent-id>\`.`,
    '5. Never target an agent that is not listed in the generated `subagents.agents` block.',
    '',
    '## Dispatch API',
    '',
    `Use the bundled sibling script \`${MANAGED_DISPATCH_SCRIPT_NAME}\` for dispatches.`,
    'It derives the source agent id from `HERMES_HOME` and uses `HERMES_MANAGER_BASE_URL` when provided, otherwise `http://127.0.0.1:18470`.',
    '',
    'Example:',
    '',
    '```bash',
    `printf "Goal: <single delegated objective>" | ./${MANAGED_DISPATCH_SCRIPT_NAME} <target-agent-id>`,
    '```',
    '',
    'Use the script instead of manually constructing curl payloads yourself.',
    '',
    'Important: this endpoint returns Server-Sent Events (SSE).',
    'A successful dispatch can keep the HTTP connection open while the target agent is still working or streaming progress.',
    'Do not treat an open connection or keepalive frames as a failure.',
    'Do not use a short `curl --max-time` and assume timeout means dispatch failed.',
    '',
    'If the current task already includes delegation metadata, preserve and extend it instead of resetting it.',
    'Do not revisit an agent already present in `dispatchPath`.',
    'Do not exceed `rules.maxHop`.',
    'Consider dispatch successful once the target agent has clearly started and is emitting progress or output.',
    'Judge success from the stream content or downstream evidence, not from waiting for the HTTP connection to close quickly.',
    '',
    '## Message template',
    '',
    '```text',
    'Goal: <single delegated objective>',
    '',
    'Context:',
    '- <required background>',
    '- <relevant files, state, or prior findings>',
    '',
    'Constraints:',
    '- stay within the requested scope',
    '- do not make unrelated changes',
    '',
    'Return:',
    '- summary',
    '- concrete findings or changes',
    '- any open risks or follow-ups',
    '```',
    '',
    '## Never do this',
    '',
    '- call raw `hermes chat` against another managed agent',
    '- delegate to an unlisted agent',
    '- send a vague request like "look into this" without context',
    '- manually search for source agent id or dispatch script path instead of following this skill',
    '- ignore `dispatchPath` or `maxHop` constraints',
    '',
    'This skill is manager-owned and auto-managed from delegation policy. Do not manually edit or remove it.',
  ].join('\n');
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
    return {
      valid: false,
      error: `target agent "${request.targetAgent}" already visited (revisit)`,
    };
  }
  if (request.hopCount >= policy.maxHop) {
    return {
      valid: false,
      error: `hop count ${request.hopCount} would exceed maxHop ${policy.maxHop}`,
    };
  }
  return { valid: true };
}
