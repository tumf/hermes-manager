import fs from 'node:fs/promises';
import path from 'node:path';

import * as yaml from 'js-yaml';

import { stripZeroWidthSpace } from './text-sanitizer';

const MCP_DOCS_URL =
  'https://hermes-agent.nousresearch.com/docs/guides/use-mcp-with-hermes';

export function getMcpDocsUrl(): string {
  return MCP_DOCS_URL;
}

export function extractMcpFragment(config: Record<string, unknown>): string {
  const mcpServers = config.mcp_servers;
  if (mcpServers === undefined || mcpServers === null) return '';
  return yaml.dump(mcpServers, { lineWidth: -1 });
}

export function parseMcpFragment(content: string): {
  value: Record<string, unknown> | null;
  error?: string;
} {
  const trimmed = content.trim();
  if (trimmed === '') return { value: null };

  let parsed: unknown;
  try {
    parsed = yaml.load(trimmed);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid YAML';
    return { value: null, error: `Invalid YAML: ${message}` };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { value: null, error: 'MCP configuration must be a YAML mapping/object' };
  }

  return { value: parsed as Record<string, unknown> };
}

export async function readMcpConfig(agentHome: string): Promise<string> {
  const configPath = path.join(agentHome, 'config.yaml');
  let content: string;
  try {
    content = await fs.readFile(configPath, 'utf-8');
  } catch {
    return '';
  }

  const parsed = yaml.load(content);
  if (typeof parsed !== 'object' || parsed === null) return '';

  return extractMcpFragment(parsed as Record<string, unknown>);
}

export async function writeMcpConfig(
  agentHome: string,
  rawContent: string,
): Promise<{ error?: string }> {
  const content = stripZeroWidthSpace(rawContent);
  const { value: mcpValue, error } = parseMcpFragment(content);
  if (error) return { error };

  const configPath = path.join(agentHome, 'config.yaml');

  let existingConfig: Record<string, unknown> = {};
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const parsed = yaml.load(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      existingConfig = parsed as Record<string, unknown>;
    }
  } catch {
    // file doesn't exist or isn't valid – start fresh
  }

  if (mcpValue === null) {
    delete existingConfig.mcp_servers;
  } else {
    existingConfig.mcp_servers = mcpValue;
  }

  const serialized = yaml.dump(existingConfig, { lineWidth: -1 });
  const tmpPath = `${configPath}.tmp`;
  await fs.writeFile(tmpPath, serialized, 'utf-8');
  await fs.rename(tmpPath, configPath);

  return {};
}
