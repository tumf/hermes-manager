import fsp from 'node:fs/promises';
import path from 'node:path';

import type { DelegationPolicy } from './delegation';
import {
  buildManagedDispatchSkillContent,
  buildSubagentSoulBlock,
  injectSubagentSoulBlock,
  MANAGED_DISPATCH_SCRIPT_NAME,
  MANAGED_DISPATCH_SKILL,
  readDelegationPolicy,
  resolveTargetMeta,
} from './delegation';
import { getRuntimeAgentsRootPath } from './runtime-paths';
import { assembleSoulSource } from './soul-assembly';
import { stripZeroWidthSpace } from './text-sanitizer';

async function ensureManagedSkill(agentHome: string): Promise<void> {
  const skillDir = path.join(agentHome, 'skills', MANAGED_DISPATCH_SKILL);
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  const bundledScriptPath = path.join(skillDir, MANAGED_DISPATCH_SCRIPT_NAME);
  const sourceScriptPath = path.join(process.cwd(), 'scripts', MANAGED_DISPATCH_SCRIPT_NAME);
  await fsp.mkdir(skillDir, { recursive: true });
  await fsp.writeFile(skillMdPath, buildManagedDispatchSkillContent(), 'utf-8');
  await fsp.copyFile(sourceScriptPath, bundledScriptPath);
  await fsp.chmod(bundledScriptPath, 0o755);
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

export async function findAgentsDelegatingTo(targetAgentId: string): Promise<string[]> {
  const agentsRoot = getRuntimeAgentsRootPath();
  let entries: string[];
  try {
    entries = await fsp.readdir(agentsRoot);
  } catch {
    return [];
  }

  const dependents: string[] = [];
  const emptyPolicy: DelegationPolicy = { allowedAgents: [], maxHop: 3 };
  for (const agentId of entries) {
    if (agentId === targetAgentId) continue;
    const agentHome = path.join(agentsRoot, agentId);
    const stat = await fsp.stat(agentHome).catch(() => null);
    if (!stat?.isDirectory()) continue;

    const policy = await readDelegationPolicy(agentHome).catch(() => emptyPolicy);
    if (policy.allowedAgents.includes(targetAgentId)) {
      dependents.push(agentId);
    }
  }

  return dependents;
}

export async function refreshDependentSoulsForTarget(targetAgentId: string): Promise<string[]> {
  const dependentAgentIds = await findAgentsDelegatingTo(targetAgentId);
  const rebuilt: string[] = [];
  const emptyPolicy: DelegationPolicy = { allowedAgents: [], maxHop: 3 };

  for (const agentId of dependentAgentIds) {
    const agentHome = getRuntimeAgentsRootPath(agentId);
    const policy = await readDelegationPolicy(agentHome).catch(() => emptyPolicy);
    await regenerateSoulWithDelegation(agentHome, policy);
    rebuilt.push(agentId);
  }

  return rebuilt;
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
