import { execFile } from 'node:child_process';
import os from 'node:os';
import { promisify } from 'node:util';

import type { AgentMeta } from './agent-fs';
import { readConfigYaml, readMetaJson } from './agent-fs';
import { discoverApiServerStatus, type ApiServerStatus } from './gateway-discovery';
import { parsePid, parseRunning } from './launchd';

const execFileAsync = promisify(execFile);

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
  apiServerStatusReason?: string;
  apiServerAvailable: boolean;
  apiServerPort: number | null;
}

export const PROCESS_INFO_PLACEHOLDER: AgentProcessInfo = {
  memoryRssBytes: null,
  hermesVersion: null,
};

export function getAgentLabel(agentId: string): string {
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

export async function resolveAgentProcessInfo(
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

export interface BuildAgentParams {
  agentId: string;
  agentHome: string;
  stat: { birthtime: Date; mtime: Date };
  processInfo: AgentProcessInfo;
}

export function buildAgentView(params: BuildAgentParams): Agent {
  const { agentId, agentHome, stat, processInfo } = params;
  const config = readConfigYaml(agentHome);
  const meta = readMetaJson(agentHome);
  const discovery = discoverApiServerStatus(agentHome);
  const apiServerPort = discovery.port ?? meta.apiServerPort ?? null;

  return {
    agentId,
    home: agentHome,
    label: getAgentLabel(agentId),
    enabled: config.enabled === true,
    createdAt: stat.birthtime,
    updatedAt: stat.mtime,
    ...meta,
    apiServerStatus: discovery.status,
    apiServerStatusReason: discovery.reason,
    apiServerAvailable: discovery.status === 'connected' && apiServerPort !== null,
    apiServerPort,
    ...processInfo,
  };
}
