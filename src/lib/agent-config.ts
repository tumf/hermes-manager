import fs from 'node:fs/promises';
import path from 'node:path';

import * as yaml from 'js-yaml';

export class AgentConfigError extends Error {
  status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = 'AgentConfigError';
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readAgentConfig(agentHome: string): Promise<Record<string, unknown>> {
  const configPath = path.join(agentHome, 'config.yaml');
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const parsed = yaml.load(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function readAgentMcpConfigContent(agentHome: string): Promise<string> {
  const config = await readAgentConfig(agentHome);
  const mcpServers = config.mcp_servers;
  if (!isRecord(mcpServers) || Object.keys(mcpServers).length === 0) {
    return '';
  }

  return yaml.dump(mcpServers, {
    noRefs: true,
    lineWidth: 120,
  });
}

export async function writeAgentMcpConfigContent(
  agentHome: string,
  content: string,
): Promise<void> {
  const configPath = path.join(agentHome, 'config.yaml');
  const nextConfig = await readAgentConfig(agentHome);
  const trimmed = content.trim();

  if (!trimmed) {
    delete nextConfig.mcp_servers;
  } else {
    let parsed: unknown;
    try {
      parsed = yaml.load(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'invalid YAML';
      throw new AgentConfigError(`Invalid YAML: ${message}`);
    }

    if (!isRecord(parsed)) {
      throw new AgentConfigError('MCP config must be a YAML mapping/object');
    }

    nextConfig.mcp_servers = parsed;
  }

  const serialized = yaml.dump(nextConfig, {
    noRefs: true,
    lineWidth: 120,
  });

  const tmpPath = `${configPath}.tmp`;
  await fs.writeFile(tmpPath, serialized, 'utf-8');
  await fs.rename(tmpPath, configPath);
}
