import fs from 'node:fs/promises';
import path from 'node:path';

import { parsePartialReferences, readPartial } from './partials';
import { stripZeroWidthSpace } from './text-sanitizer';

const PARTIAL_REFERENCE_PATTERN = /\{\{partial:([a-zA-Z0-9_-]+)\}\}/g;

export class SoulAssemblyError extends Error {
  readonly partialName: string;

  constructor(partialName: string) {
    super(`Unknown partial reference: ${partialName}`);
    this.name = 'SoulAssemblyError';
    this.partialName = partialName;
  }
}

async function assertNoNestedPartials(partialName: string, content: string): Promise<void> {
  const nested = parsePartialReferences(content);
  if (nested.length > 0) {
    throw new SoulAssemblyError(partialName);
  }
}

export async function assembleSoulSource(source: string): Promise<string> {
  const references = parsePartialReferences(source);
  if (references.length === 0) {
    return source;
  }

  const contents = new Map<string, string>();
  for (const referenceName of references) {
    const content = await readPartial(referenceName);
    if (content === null) {
      throw new SoulAssemblyError(referenceName);
    }
    await assertNoNestedPartials(referenceName, content);
    contents.set(referenceName, content);
  }

  return source.replaceAll(
    PARTIAL_REFERENCE_PATTERN,
    (_, name: string) => contents.get(name) ?? '',
  );
}

export async function writeSoulSourceAndAssembled(
  agentHome: string,
  source: string,
): Promise<{ assembled: string }> {
  const sanitizedSource = stripZeroWidthSpace(source);
  const assembled = await assembleSoulSource(sanitizedSource);

  const sourcePath = path.join(agentHome, 'SOUL.src.md');
  const soulPath = path.join(agentHome, 'SOUL.md');
  const sourceTmpPath = `${sourcePath}.tmp`;
  const soulTmpPath = `${soulPath}.tmp`;

  await fs.writeFile(sourceTmpPath, sanitizedSource, 'utf-8');
  await fs.writeFile(soulTmpPath, assembled, 'utf-8');

  await fs.rename(sourceTmpPath, sourcePath);
  await fs.rename(soulTmpPath, soulPath);

  return { assembled };
}

export async function rebuildSoulForAgent(agentHome: string): Promise<boolean> {
  const sourcePath = path.join(agentHome, 'SOUL.src.md');
  const source = await fs.readFile(sourcePath, 'utf-8').catch(() => null);
  if (typeof source !== 'string') {
    return false;
  }

  await writeSoulSourceAndAssembled(agentHome, source);
  return true;
}
