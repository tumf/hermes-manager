import fs from 'node:fs';
import path from 'node:path';

import { getRuntimeTemplatesRootPath } from './runtime-paths';

const ALLOWED_FILES = ['SOUL.md', 'memories/MEMORY.md', 'memories/USER.md', 'config.yaml'] as const;
type TemplateFile = (typeof ALLOWED_FILES)[number];

// Hardcoded fallback content for agent scaffolding when no template file exists
const FALLBACK_CONTENT: Record<TemplateFile, (id: string) => string> = {
  'SOUL.md': (id: string) => `# Soul: ${id}\n`,
  'memories/MEMORY.md': (id: string) => `# Memory: ${id}\n`,
  'memories/USER.md': (id: string) => `# User: ${id}\n`,
  'config.yaml': (id: string) => `name: ${id}\n`,
};

/**
 * Validate that a template name or file name is safe (no traversal).
 * Must be non-empty, contain only [a-zA-Z0-9_\-.], and not contain path separators.
 */
export function isValidName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

export function isValidFileName(file: string): boolean {
  return ALLOWED_FILES.includes(file as TemplateFile);
}

export interface TemplateListEntry {
  name: string;
  files: string[];
}

/**
 * List all templates by scanning runtime/templates/ directories.
 */
export function listTemplates(): TemplateListEntry[] {
  const root = getRuntimeTemplatesRootPath();
  if (!fs.existsSync(root)) return [];

  const entries = fs.readdirSync(root, { withFileTypes: true });
  const result: TemplateListEntry[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirPath = path.join(root, entry.name);
    const files = ALLOWED_FILES.filter((file) => fs.existsSync(path.join(dirPath, file))).sort();
    result.push({ name: entry.name, files });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get the content of a specific template file.
 */
export function getTemplateFile(
  name: string,
  file: string,
): { name: string; file: string; content: string } | null {
  const filePath = path.join(getRuntimeTemplatesRootPath(), name, file);
  const resolved = path.resolve(filePath);
  const root = path.resolve(getRuntimeTemplatesRootPath());

  // Traversal check
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return null;
  }

  if (!fs.existsSync(resolved)) return null;
  const content = fs.readFileSync(resolved, 'utf-8');
  return { name, file, content };
}

/**
 * Write content to a template file. Creates directory if needed.
 */
export function writeTemplateFile(
  name: string,
  file: string,
  content: string,
): { name: string; file: string; content: string } {
  const dirPath = path.join(getRuntimeTemplatesRootPath(), name);
  const filePath = path.join(dirPath, file);
  const resolved = path.resolve(filePath);
  const root = path.resolve(getRuntimeTemplatesRootPath());

  // Traversal check
  if (!resolved.startsWith(root + path.sep)) {
    throw new Error('Invalid path');
  }

  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, content, 'utf-8');
  return { name, file, content };
}

/**
 * Delete a single template file. Returns true if file existed and was deleted.
 */
export function deleteTemplateFile(name: string, file: string): boolean {
  const filePath = path.join(getRuntimeTemplatesRootPath(), name, file);
  const resolved = path.resolve(filePath);
  const root = path.resolve(getRuntimeTemplatesRootPath());

  if (!resolved.startsWith(root + path.sep)) return false;
  if (!fs.existsSync(resolved)) return false;

  fs.unlinkSync(resolved);
  return true;
}

/**
 * Delete an entire template directory. Returns true if directory existed and was deleted.
 */
export function deleteTemplate(name: string): boolean {
  const dirPath = path.join(getRuntimeTemplatesRootPath(), name);
  const resolved = path.resolve(dirPath);
  const root = path.resolve(getRuntimeTemplatesRootPath());

  if (!resolved.startsWith(root + path.sep)) return false;
  if (!fs.existsSync(resolved)) return false;

  fs.rmSync(resolved, { recursive: true, force: true });
  return true;
}

/**
 * Resolve template content for agent creation.
 * 1. Try runtime/templates/{templateName}/{fileName}
 * 2. Fall back to runtime/templates/default/{fileName}
 * 3. Fall back to hardcoded content
 */
export function resolveTemplateContent(
  fileName: TemplateFile,
  agentId: string,
  templateName?: string,
): string {
  const nameToLookup = templateName ?? 'default';

  // Try the requested template
  const result = getTemplateFile(nameToLookup, fileName);
  if (result) return result.content;

  // If a specific template was requested and not found, try default
  if (nameToLookup !== 'default') {
    const defaultResult = getTemplateFile('default', fileName);
    if (defaultResult) return defaultResult.content;
  }

  // Hardcoded fallback
  return FALLBACK_CONTENT[fileName](agentId);
}
