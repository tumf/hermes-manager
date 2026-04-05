import { execFile } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import * as yaml from 'js-yaml';

import { discoverApiServerStatus, type ApiServerStatus } from './gateway-discovery';
import { parsePid, parseRunning } from './launchd';
import { getRuntimeAgentsRootPath } from './runtime-paths';
import { writeSoulSourceAndAssembled } from './soul-assembly';

export interface AgentMeta {
  name: string;
  description: string;
  tags: string[];
}

export interface AgentProcessInfo {
  memoryRssBytes: number | null;
  hermesVersion: string | null;
}

export interface Agent extends AgentMeta, AgentProcessInfo {
  agentId: string;
  home: string;
  label: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  apiServerStatus: ApiServerStatus;
  apiServerAvailable: boolean;
  apiServerPort: number | null;
}

const DEFAULT_AGENT_META: AgentMeta = {
  name: '',
  description: '',
  tags: [],
};

const execFileAsync = promisify(execFile);
const PROCESS_INFO_PLACEHOLDER: AgentProcessInfo = {
  memoryRssBytes: null,
  hermesVersion: null,
};

function getAgentLabel(agentId: string): string {
  return `ai.hermes.gateway.${agentId}`;
}

async function resolveAgentPid(agentId: string): Promise<number | null> {
  const label = getAgentLabel(agentId);
  const uid = process.getuid?.() ?? os.userInfo().uid;

  try {
    console.debug('[agents] resolving launchd pid', { agentId, label, uid });
    const { stdout } = await execFileAsync('launchctl', ['print', `gui/${uid}/${label}`]);
    if (!parseRunning(stdout)) {
      return null;
    }

    return parsePid(stdout);
  } catch (error) {
    console.warn('[agents] failed to resolve launchd pid', {
      agentId,
      label,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function resolveMemoryRssBytes(pid: number): Promise<number | null> {
  try {
    console.debug('[agents] resolving memory rss', { pid });
    const { stdout } = await execFileAsync('ps', ['-o', 'rss=', '-p', String(pid)]);
    const rssKb = Number.parseInt(stdout.trim(), 10);
    if (!Number.isFinite(rssKb) || rssKb <= 0) {
      return null;
    }

    return rssKb * 1024;
  } catch (error) {
    console.warn('[agents] failed to resolve memory rss', {
      pid,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function resolveHermesVersion(agentHome: string): Promise<string | null> {
  try {
    console.debug('[agents] resolving hermes version', { agentHome });
    const { stdout } = await execFileAsync('hermes', ['--version'], {
      env: {
        ...process.env,
        HERMES_HOME: agentHome,
      },
    });
    const version = stdout
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    return version ?? null;
  } catch (error) {
    console.warn('[agents] failed to resolve hermes version', {
      agentHome,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function resolveAgentProcessInfo(
  agentId: string,
  agentHome: string,
): Promise<AgentProcessInfo> {
  console.info('[agents] resolving process info', { agentId, agentHome });
  const pid = await resolveAgentPid(agentId);
  const memoryRssBytes = pid !== null ? await resolveMemoryRssBytes(pid) : null;
  const hermesVersion = await resolveHermesVersion(agentHome);

  console.info('[agents] resolved process info', {
    agentId,
    pid,
    memoryRssBytes,
    hermesVersionAvailable: hermesVersion !== null,
  });

  return {
    memoryRssBytes,
    hermesVersion,
  };
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
 * Parse meta.json from an agent directory.
 * Returns default values if missing/invalid.
 */
function readMetaJson(agentHome: string): AgentMeta {
  const metaPath = path.join(agentHome, 'meta.json');
  try {
    const content = fs.readFileSync(metaPath, 'utf-8');
    const parsed = JSON.parse(content) as Partial<AgentMeta>;
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      description: typeof parsed.description === 'string' ? parsed.description : '',
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((tag): tag is string => typeof tag === 'string')
        : [],
    };
  } catch {
    return { ...DEFAULT_AGENT_META };
  }
}

async function writeMetaJson(agentHome: string, meta: AgentMeta): Promise<void> {
  const metaPath = path.join(agentHome, 'meta.json');
  await fsp.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
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
    const meta = readMetaJson(agentHome);
    const discovery = discoverApiServerStatus(agentHome);
    const apiServerPort = discovery.port;
    const processInfo = await resolveAgentProcessInfo(name, agentHome);
    agents.push({
      agentId: name,
      home: agentHome,
      label: getAgentLabel(name),
      enabled: config.enabled === true,
      createdAt: stat.birthtime,
      updatedAt: stat.mtime,
      apiServerStatus: discovery.status,
      apiServerAvailable: discovery.status === 'connected' && apiServerPort !== null,
      apiServerPort,
      ...processInfo,
      ...meta,
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
    const meta = readMetaJson(agentHome);
    const discovery = discoverApiServerStatus(agentHome);
    const apiServerPort = discovery.port;
    const processInfo = await resolveAgentProcessInfo(agentId, agentHome);
    return {
      agentId,
      home: agentHome,
      label: getAgentLabel(agentId),
      enabled: config.enabled === true,
      createdAt: stat.birthtime,
      updatedAt: stat.mtime,
      apiServerStatus: discovery.status,
      apiServerAvailable: discovery.status === 'connected' && apiServerPort !== null,
      apiServerPort,
      ...processInfo,
      ...meta,
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
  };

  if (normalizedMeta.name || normalizedMeta.description || normalizedMeta.tags.length > 0) {
    await writeMetaJson(home, normalizedMeta);
  }

  const stat = await fsp.stat(home);
  const config = readConfigYaml(home);
  const discovery = discoverApiServerStatus(home);
  const apiServerPort = discovery.port;
  return {
    agentId,
    home,
    label: getAgentLabel(agentId),
    enabled: config.enabled === true,
    createdAt: stat.birthtime,
    updatedAt: stat.mtime,
    apiServerStatus: discovery.status,
    apiServerAvailable: discovery.status === 'connected' && apiServerPort !== null,
    apiServerPort,
    ...PROCESS_INFO_PLACEHOLDER,
    ...normalizedMeta,
  };
}

export async function updateAgentMeta(agentId: string, meta: AgentMeta): Promise<AgentMeta | null> {
  const agentHome = getRuntimeAgentsRootPath(agentId);
  try {
    const stat = await fsp.stat(agentHome);
    if (!stat.isDirectory()) {
      return null;
    }

    await fsp.access(path.join(agentHome, 'config.yaml'));
    await writeMetaJson(agentHome, meta);
    return meta;
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
  };
}

/**
 * Delete an agent directory recursively.
 */
export async function deleteAgent(agentId: string): Promise<void> {
  const home = getRuntimeAgentsRootPath(agentId);
  await fsp.rm(home, { recursive: true, force: true });
}
