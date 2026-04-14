import fsp from 'node:fs/promises';
import path from 'node:path';

import type { DelegationPolicy } from './delegation';
import {
  buildSubagentSoulBlock,
  injectSubagentSoulBlock,
  MANAGED_DISPATCH_SKILL,
  resolveTargetMeta,
} from './delegation';
import { assembleSoulSource } from './soul-assembly';
import { stripZeroWidthSpace } from './text-sanitizer';

async function ensureManagedSkill(agentHome: string): Promise<void> {
  const skillDir = path.join(agentHome, 'skills', MANAGED_DISPATCH_SKILL);
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  try {
    await fsp.stat(skillMdPath);
    return;
  } catch {
    // create it
  }
  await fsp.mkdir(skillDir, { recursive: true });
  await fsp.writeFile(
    skillMdPath,
    [
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
      '- Use Hermes Manager dispatch API for every cross-agent delegation.',
      '- Never invoke another agent directly with raw `hermes chat`.',
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
      '1. Choose exactly one listed subagent that matches the task.',
      '2. Write a focused request with goal, context, constraints, and expected output.',
      '3. Call Hermes Manager dispatch API using yourself as the source agent.',
      '4. Never target an agent that is not listed in the generated `subagents.agents` block.',
      '',
      '## Dispatch API',
      '',
      'Development/local:',
      '',
      '```bash',
      'curl -N -X POST http://localhost:18470/api/agents/<source-agent-id>/dispatch \\',
      "  -H 'Content-Type: application/json' \\",
      "  -d '{",
      '    "targetAgent": "<target-agent-id>",',
      '    "message": "<delegated task request>",',
      '    "dispatchPath": ["<source-agent-id>"],',
      '    "hopCount": 0',
      "  }'",
      '```',
      '',
      'Production on mini:',
      '',
      '```bash',
      'curl -N -X POST https://hermes-manager.mini.tumf.dev/api/agents/<source-agent-id>/dispatch \\',
      "  -H 'Content-Type: application/json' \\",
      "  -d '{",
      '    "targetAgent": "<target-agent-id>",',
      '    "message": "<delegated task request>",',
      '    "dispatchPath": ["<source-agent-id>"],',
      '    "hopCount": 0',
      "  }'",
      '```',
      '',
      'If the current task already includes delegation metadata, preserve and extend it instead of resetting it.',
      'Do not revisit an agent already present in `dispatchPath`.',
      'Do not exceed `rules.maxHop`.',
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
      '- ignore `dispatchPath` or `maxHop` constraints',
      '',
      'This skill is manager-owned and auto-managed from delegation policy. Do not manually edit or remove it.',
    ].join('\n'),
    'utf-8',
  );
}

async function removeManagedSkill(agentHome: string): Promise<void> {
  const skillDir = path.join(agentHome, 'skills', MANAGED_DISPATCH_SKILL);
  await fsp.rm(skillDir, { recursive: true, force: true });
}

async function regenerateSoulWithDelegation(
  agentHome: string,
  policy: DelegationPolicy,
): Promise<void> {
  const sourcePath = path.join(agentHome, 'SOUL.src.md');
  const soulPath = path.join(agentHome, 'SOUL.md');

  let source: string;
  try {
    source = await fsp.readFile(sourcePath, 'utf-8');
  } catch {
    try {
      source = await fsp.readFile(soulPath, 'utf-8');
    } catch {
      return;
    }
  }

  const sanitized = stripZeroWidthSpace(source);
  const assembled = await assembleSoulSource(sanitized);

  let block = '';
  if (policy.allowedAgents.length > 0) {
    const targets = await resolveTargetMeta(policy.allowedAgents);
    block = buildSubagentSoulBlock(policy, targets);
  }

  const final = injectSubagentSoulBlock(assembled, block);
  const tmpPath = `${soulPath}.tmp`;
  await fsp.writeFile(tmpPath, final, 'utf-8');
  await fsp.rename(tmpPath, soulPath);
}

export async function syncDelegationForAgent(
  agentId: string,
  agentHome: string,
  policy: DelegationPolicy,
): Promise<void> {
  if (policy.allowedAgents.length > 0) {
    await ensureManagedSkill(agentHome);
  } else {
    await removeManagedSkill(agentHome);
  }

  await regenerateSoulWithDelegation(agentHome, policy);
}
