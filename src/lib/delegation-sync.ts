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
      `# ${MANAGED_DISPATCH_SKILL}`,
      '',
      'Manager-owned skill for dispatching tasks to allowed subagents.',
      'This skill is automatically managed by Hermes Manager delegation policy.',
      'Do not manually edit or remove.',
      '',
      '## Usage',
      '',
      'Use this skill to delegate tasks to your allowed subagents as defined',
      'in the managed subagent block of your SOUL instructions.',
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
