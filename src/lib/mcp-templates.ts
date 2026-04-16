import fs from 'node:fs';
import path from 'node:path';

import * as yaml from 'js-yaml';

import { getRuntimeMcpTemplatesRootPath } from './runtime-paths';
import { stripZeroWidthSpace } from './text-sanitizer';

export class McpTemplateError extends Error {
  status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = 'McpTemplateError';
    this.status = status;
  }
}

export function isValidMcpTemplateName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

export interface McpTemplateListEntry {
  name: string;
}

export interface McpTemplateRecord {
  name: string;
  content: string;
}

function resolveSafePath(name: string): string | null {
  if (!isValidMcpTemplateName(name)) return null;
  const root = path.resolve(getRuntimeMcpTemplatesRootPath());
  const resolved = path.resolve(path.join(root, `${name}.yaml`));
  if (!resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

export function parseMcpTemplateContent(content: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = yaml.load(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid YAML';
    throw new McpTemplateError(`Invalid YAML: ${message}`);
  }

  if (parsed === null || parsed === undefined) {
    throw new McpTemplateError('MCP template content must be a YAML mapping/object');
  }

  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new McpTemplateError('MCP template content must be a YAML mapping/object');
  }

  return parsed as Record<string, unknown>;
}

export function listMcpTemplates(): McpTemplateListEntry[] {
  const root = getRuntimeMcpTemplatesRootPath();
  if (!fs.existsSync(root)) return [];

  const entries = fs.readdirSync(root, { withFileTypes: true });
  const result: McpTemplateListEntry[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.yaml')) continue;
    const name = entry.name.slice(0, -5);
    if (!isValidMcpTemplateName(name)) continue;
    result.push({ name });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export function getMcpTemplate(name: string): McpTemplateRecord | null {
  const resolved = resolveSafePath(name);
  if (!resolved) return null;
  if (!fs.existsSync(resolved)) return null;
  const content = fs.readFileSync(resolved, 'utf-8');
  return { name, content };
}

export function mcpTemplateExists(name: string): boolean {
  const resolved = resolveSafePath(name);
  if (!resolved) return false;
  return fs.existsSync(resolved);
}

export function writeMcpTemplate(name: string, content: string): McpTemplateRecord {
  const resolved = resolveSafePath(name);
  if (!resolved) {
    throw new McpTemplateError('Invalid template name', 400);
  }
  const sanitized = stripZeroWidthSpace(content);
  parseMcpTemplateContent(sanitized);

  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, sanitized, 'utf-8');
  return { name, content: sanitized };
}

export function deleteMcpTemplate(name: string): boolean {
  const resolved = resolveSafePath(name);
  if (!resolved) return false;
  if (!fs.existsSync(resolved)) return false;
  fs.unlinkSync(resolved);
  return true;
}
