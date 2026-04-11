import fsp from 'node:fs/promises';
import path from 'node:path';

import type { AgentMeta } from './agent-fs';
import { isApiServerPortInRange, readMetaJson, writeMetaJson } from './agent-fs';
import type { Agent } from './agent-view';
import { buildAgentView, PROCESS_INFO_PLACEHOLDER, resolveAgentProcessInfo } from './agent-view';
import { getRuntimeAgentsRootPath } from './runtime-paths';
import { writeSoulSourceAndAssembled } from './soul-assembly';

export type { AgentMeta } from './agent-fs';
export type { Agent, AgentProcessInfo } from './agent-view';
export { allocateApiServerPort } from './agent-port';

export async function listAgents(): Promise<Agent[]> {
  const agentsRoot = getRuntimeAgentsRootPath();
  let entries: string[];
  try {
    entries = await fsp.readdir(agentsRoot);
  } catch {
    return [];
  }

  const agents: Agent[] = [];
  for (const name of entries) {
    const agentHome = path.join(agentsRoot, name);
    const stat = await fsp.stat(agentHome).catch(() => null);
    if (!stat || !stat.isDirectory()) continue;

    const configPath = path.join(agentHome, 'config.yaml');
    try {
      await fsp.access(configPath);
    } catch {
      continue;
    }

    const processInfo = await resolveAgentProcessInfo(name, agentHome);
    agents.push(buildAgentView({ agentId: name, agentHome, stat, processInfo }));
  }

  return agents;
}

export async function getAgent(agentId: string): Promise<Agent | null> {
  const agentHome = getRuntimeAgentsRootPath(agentId);
  try {
    const stat = await fsp.stat(agentHome);
    if (!stat.isDirectory()) return null;

    await fsp.access(path.join(agentHome, 'config.yaml'));

    const processInfo = await resolveAgentProcessInfo(agentId, agentHome);
    return buildAgentView({ agentId, agentHome, stat, processInfo });
  } catch {
    return null;
  }
}

export async function agentExists(agentId: string): Promise<boolean> {
  const agentHome = getRuntimeAgentsRootPath(agentId);
  try {
    const stat = await fsp.stat(agentHome);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function createAgent(
  agentId: string,
  files: { memoryMd: string; userMd: string; soulSrcMd: string; configYaml: string },
  meta: Partial<AgentMeta> = {},
): Promise<Agent> {
  const home = getRuntimeAgentsRootPath(agentId);
  await fsp.mkdir(path.join(home, 'logs'), { recursive: true });
  await fsp.mkdir(path.join(home, 'memories'), { recursive: true });
  await fsp.writeFile(path.join(home, 'memories', 'MEMORY.md'), files.memoryMd);
  await fsp.writeFile(path.join(home, 'memories', 'USER.md'), files.userMd);
  await writeSoulSourceAndAssembled(home, files.soulSrcMd);
  await fsp.writeFile(path.join(home, 'config.yaml'), files.configYaml);
  await fsp.writeFile(path.join(home, '.env'), '');

  const normalizedMeta: AgentMeta = {
    name: meta.name ?? '',
    description: meta.description ?? '',
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    apiServerPort: isApiServerPortInRange(meta.apiServerPort) ? meta.apiServerPort : undefined,
  };

  if (
    normalizedMeta.name ||
    normalizedMeta.description ||
    normalizedMeta.tags.length > 0 ||
    typeof normalizedMeta.apiServerPort === 'number'
  ) {
    await writeMetaJson(home, normalizedMeta);
  }

  const stat = await fsp.stat(home);
  return buildAgentView({
    agentId,
    agentHome: home,
    stat,
    processInfo: PROCESS_INFO_PLACEHOLDER,
  });
}

export async function updateAgentMeta(agentId: string, meta: AgentMeta): Promise<AgentMeta | null> {
  const agentHome = getRuntimeAgentsRootPath(agentId);
  try {
    const stat = await fsp.stat(agentHome);
    if (!stat.isDirectory()) {
      return null;
    }

    await fsp.access(path.join(agentHome, 'config.yaml'));
    const existingMeta = readMetaJson(agentHome);
    const nextMeta: AgentMeta = {
      name: meta.name,
      description: meta.description,
      tags: meta.tags,
      apiServerPort: isApiServerPortInRange(meta.apiServerPort)
        ? meta.apiServerPort
        : existingMeta.apiServerPort,
    };
    await writeMetaJson(agentHome, nextMeta);
    return nextMeta;
  } catch {
    return null;
  }
}

export async function readAgentMeta(agentId: string): Promise<AgentMeta | null> {
  const agent = await getAgent(agentId);
  if (!agent) {
    return null;
  }

  return {
    name: agent.name,
    description: agent.description,
    tags: agent.tags,
    apiServerPort: agent.apiServerPort,
  };
}

export async function deleteAgent(agentId: string): Promise<void> {
  const home = getRuntimeAgentsRootPath(agentId);
  await fsp.rm(home, { recursive: true, force: true });
}
