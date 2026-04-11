import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import * as yaml from 'js-yaml';

export interface AgentMeta {
  name: string;
  description: string;
  tags: string[];
  apiServerPort?: number | null;
}

export const API_SERVER_PORT_MIN = 8642;
export const API_SERVER_PORT_MAX = 8699;

export const DEFAULT_AGENT_META: AgentMeta = {
  name: '',
  description: '',
  tags: [],
};

export function readConfigYaml(agentHome: string): Record<string, unknown> {
  const configPath = path.join(agentHome, 'config.yaml');
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = yaml.load(content);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function readMetaJson(agentHome: string): AgentMeta {
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
      apiServerPort:
        typeof parsed.apiServerPort === 'number' &&
        Number.isInteger(parsed.apiServerPort) &&
        parsed.apiServerPort >= API_SERVER_PORT_MIN &&
        parsed.apiServerPort <= API_SERVER_PORT_MAX
          ? parsed.apiServerPort
          : undefined,
    };
  } catch {
    return { ...DEFAULT_AGENT_META };
  }
}

export async function writeMetaJson(agentHome: string, meta: AgentMeta): Promise<void> {
  const metaPath = path.join(agentHome, 'meta.json');
  const payload: Record<string, unknown> = {
    name: meta.name,
    description: meta.description,
    tags: meta.tags,
  };
  if (typeof meta.apiServerPort === 'number') {
    payload.apiServerPort = meta.apiServerPort;
  }
  await fsp.writeFile(metaPath, JSON.stringify(payload, null, 2), 'utf-8');
}

export function isApiServerPortInRange(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= API_SERVER_PORT_MIN &&
    value <= API_SERVER_PORT_MAX
  );
}

export function parseEnvApiServerPort(content: string): number | null {
  for (const line of content.split(/\r?\n/)) {
    if (line.startsWith('API_SERVER_PORT=')) {
      const value = line.slice('API_SERVER_PORT='.length);
      const trimmed = value.replace(/^"|"$/g, '').trim();
      const num = Number.parseInt(trimmed, 10);
      if (Number.isInteger(num) && num >= API_SERVER_PORT_MIN && num <= API_SERVER_PORT_MAX) {
        return num;
      }
    }
  }
  return null;
}
