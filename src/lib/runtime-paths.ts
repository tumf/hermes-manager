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

export function ensureRuntimeDirectories(): void {
  fs.mkdirSync(getRuntimeAgentsRootPath(), { recursive: true });
  fs.mkdirSync(getRuntimeGlobalsRootPath(), { recursive: true });
  fs.mkdirSync(getRuntimeDataRootPath(), { recursive: true });
  fs.mkdirSync(getRuntimeLogsRootPath(), { recursive: true });
}
