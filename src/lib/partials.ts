import fs from 'node:fs/promises';
import path from 'node:path';

import { getRuntimeAgentsRootPath, getRuntimePartialsRootPath } from './runtime-paths';

export const PARTIAL_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const PARTIAL_REFERENCE_PATTERN = /\{\{partial:([a-zA-Z0-9_-]+)\}\}/g;

export interface PartialEntry {
  name: string;
  content: string;
}

function toPartialPath(name: string): string {
  return getRuntimePartialsRootPath(`${name}.md`);
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function isValidPartialName(name: string): boolean {
  return PARTIAL_NAME_PATTERN.test(name);
}

export function parsePartialReferences(source: string): string[] {
  const found = new Set<string>();
  for (const match of source.matchAll(PARTIAL_REFERENCE_PATTERN)) {
    if (match[1]) {
      found.add(match[1]);
    }
  }
  return [...found];
}

export async function listPartialNames(): Promise<string[]> {
  const partialsRoot = getRuntimePartialsRootPath();
  const entries = await fs.readdir(partialsRoot, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name.slice(0, -3))
    .filter((name) => isValidPartialName(name))
    .sort((a, b) => a.localeCompare(b));
}

export async function listPartials(): Promise<PartialEntry[]> {
  const names = await listPartialNames();
  const partials = await Promise.all(
    names.map(async (name) => ({
      name,
      content: await readPartial(name),
    })),
  );
  return partials.filter((entry): entry is PartialEntry => entry.content !== null);
}

export async function readPartial(name: string): Promise<string | null> {
  if (!isValidPartialName(name)) {
    return null;
  }

  const partialPath = toPartialPath(name);
  const content = await fs.readFile(partialPath, 'utf-8').catch(() => null);
  return typeof content === 'string' ? content : null;
}

export async function writePartial(name: string, content: string): Promise<void> {
  if (!isValidPartialName(name)) {
    throw new Error('invalid partial name');
  }

  const partialPath = toPartialPath(name);
  const tmpPath = `${partialPath}.tmp`;
  await fs.mkdir(path.dirname(partialPath), { recursive: true });
  await fs.writeFile(tmpPath, content, 'utf-8');
  await fs.rename(tmpPath, partialPath);
}

export async function deletePartial(name: string): Promise<boolean> {
  if (!isValidPartialName(name)) {
    return false;
  }

  const partialPath = toPartialPath(name);
  if (!(await pathExists(partialPath))) {
    return false;
  }

  await fs.unlink(partialPath);
  return true;
}

export async function findAgentsUsingPartial(name: string): Promise<string[]> {
  if (!isValidPartialName(name)) {
    return [];
  }

  const agentsRoot = getRuntimeAgentsRootPath();
  const entries = await fs.readdir(agentsRoot, { withFileTypes: true }).catch(() => []);
  const users: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const soulSourcePath = path.join(agentsRoot, entry.name, 'SOUL.src.md');
    const source = await fs.readFile(soulSourcePath, 'utf-8').catch(() => null);
    if (typeof source !== 'string') {
      continue;
    }

    if (parsePartialReferences(source).includes(name)) {
      users.push(entry.name);
    }
  }

  return users.sort((a, b) => a.localeCompare(b));
}
