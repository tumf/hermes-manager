import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import * as yaml from 'js-yaml';

import { getRuntimeAgentsRootPath } from './runtime-paths';

export interface Agent {
  agentId: string;
  home: string;
  label: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Parse config.yaml from an agent directory.
 * Returns an empty object if the file doesn't exist or is invalid.
 */
function readConfigYaml(agentHome: string): Record<string, unknown> {
  const configPath = path.join(agentHome, 'config.yaml');
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = yaml.load(content);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * List all agents by scanning runtime/agents/ directories.
 * Each subdirectory that contains a config.yaml is treated as an agent.
 */
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

    // Only include directories that have config.yaml
    const configPath = path.join(agentHome, 'config.yaml');
    try {
      await fsp.access(configPath);
    } catch {
      continue;
    }

    const config = readConfigYaml(agentHome);
    agents.push({
      agentId: name,
      home: agentHome,
      label: `ai.hermes.gateway.${name}`,
      enabled: config.enabled === true,
      createdAt: stat.birthtime,
      updatedAt: stat.mtime,
    });
  }

  return agents;
}

/**
 * Get a single agent by ID.
 * Returns null if the agent directory doesn't exist or lacks config.yaml.
 */
export async function getAgent(agentId: string): Promise<Agent | null> {
  const agentHome = getRuntimeAgentsRootPath(agentId);
  try {
    const stat = await fsp.stat(agentHome);
    if (!stat.isDirectory()) return null;

    // Verify config.yaml exists
    await fsp.access(path.join(agentHome, 'config.yaml'));

    const config = readConfigYaml(agentHome);
    return {
      agentId,
      home: agentHome,
      label: `ai.hermes.gateway.${agentId}`,
      enabled: config.enabled === true,
      createdAt: stat.birthtime,
      updatedAt: stat.mtime,
    };
  } catch {
    return null;
  }
}

/**
 * Check if an agent directory exists on the filesystem.
 */
export async function agentExists(agentId: string): Promise<boolean> {
  const agentHome = getRuntimeAgentsRootPath(agentId);
  try {
    const stat = await fsp.stat(agentHome);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Create a new agent directory with the default file scaffold.
 * Does NOT check for uniqueness — caller should verify beforehand.
 */
export async function createAgent(
  agentId: string,
  files: { agentsMd: string; soulMd: string; configYaml: string },
): Promise<Agent> {
  const home = getRuntimeAgentsRootPath(agentId);
  await fsp.mkdir(path.join(home, 'logs'), { recursive: true });
  await fsp.writeFile(path.join(home, 'AGENTS.md'), files.agentsMd);
  await fsp.writeFile(path.join(home, 'SOUL.md'), files.soulMd);
  await fsp.writeFile(path.join(home, 'config.yaml'), files.configYaml);
  await fsp.writeFile(path.join(home, '.env'), '');

  const stat = await fsp.stat(home);
  const config = readConfigYaml(home);
  return {
    agentId,
    home,
    label: `ai.hermes.gateway.${agentId}`,
    enabled: config.enabled === true,
    createdAt: stat.birthtime,
    updatedAt: stat.mtime,
  };
}

/**
 * Delete an agent directory recursively.
 */
export async function deleteAgent(agentId: string): Promise<void> {
  const home = getRuntimeAgentsRootPath(agentId);
  await fsp.rm(home, { recursive: true, force: true });
}
