import fs from 'node:fs';
import path from 'node:path';

export function getProjectRootPath(...segments: string[]): string {
  return path.join(process.cwd(), ...segments);
}

export function getRuntimeRootPath(...segments: string[]): string {
  return getProjectRootPath('runtime', ...segments);
}

export function getRuntimeAgentsRootPath(...segments: string[]): string {
  return getRuntimeRootPath('agents', ...segments);
}

export function getRuntimeGlobalsRootPath(...segments: string[]): string {
  return getRuntimeRootPath('globals', ...segments);
}

export function getRuntimeDataRootPath(...segments: string[]): string {
  return getRuntimeRootPath('data', ...segments);
}

export function getRuntimeLogsRootPath(...segments: string[]): string {
  return getRuntimeRootPath('logs', ...segments);
}

export function getRuntimeTemplatesRootPath(...segments: string[]): string {
  return getRuntimeRootPath('templates', ...segments);
}

// Hardcoded default template content — used when runtime/templates/default/ files are missing
const DEFAULT_MEMORY_MD = `# Memory: {id}

Store stable memory and long-term context here.
`;

const DEFAULT_USER_MD = `# User: {id}

Store user profile, preferences, and constraints here.
`;

const DEFAULT_SOUL_MD = `# Soul

This file defines the agent's personality and behavior.
`;

const DEFAULT_CONFIG_YAML = `name: default
`;

const DEFAULT_TEMPLATE_FILES: Record<string, string> = {
  'MEMORY.md': DEFAULT_MEMORY_MD,
  'USER.md': DEFAULT_USER_MD,
  'SOUL.md': DEFAULT_SOUL_MD,
  'config.yaml': DEFAULT_CONFIG_YAML,
};

/**
 * Ensure default template files exist under runtime/templates/default/.
 * Only creates missing files — never overwrites existing ones.
 */
function ensureDefaultTemplates(): void {
  const defaultDir = getRuntimeTemplatesRootPath('default');
  fs.mkdirSync(defaultDir, { recursive: true });

  for (const [filename, content] of Object.entries(DEFAULT_TEMPLATE_FILES)) {
    const filePath = path.join(defaultDir, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  }
}

export function ensureRuntimeDirectories(): void {
  fs.mkdirSync(getRuntimeAgentsRootPath(), { recursive: true });
  fs.mkdirSync(getRuntimeGlobalsRootPath(), { recursive: true });
  fs.mkdirSync(getRuntimeLogsRootPath(), { recursive: true });
  fs.mkdirSync(getRuntimeTemplatesRootPath(), { recursive: true });
  ensureDefaultTemplates();
}
