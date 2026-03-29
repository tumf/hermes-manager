import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import { deriveRelativePath } from './skills';

export interface SkillLink {
  agent: string;
  sourcePath: string;
  targetPath: string;
  relativePath: string;
  exists: boolean;
}

/**
 * Recursively scan a directory for symlinks and return their paths.
 */
async function findSymlinks(dir: string): Promise<string[]> {
  const result: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return result;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      result.push(fullPath);
    } else if (entry.isDirectory()) {
      const nested = await findSymlinks(fullPath);
      result.push(...nested);
    }
  }
  return result;
}

/**
 * List all skill links for an agent by scanning the skills/ directory for symlinks.
 */
export async function listSkillLinks(agentId: string, agentHome: string): Promise<SkillLink[]> {
  const skillsDir = path.join(agentHome, 'skills');
  const symlinkPaths = await findSymlinks(skillsDir);

  const links: SkillLink[] = [];
  for (const targetPath of symlinkPaths) {
    let sourcePath: string;
    let exists = false;
    try {
      sourcePath = await fsp.readlink(targetPath);
      // Check if the source actually exists
      try {
        await fsp.stat(sourcePath);
        exists = true;
      } catch {
        exists = false;
      }
    } catch {
      continue;
    }

    const relativePath = deriveRelativePath(sourcePath) || path.basename(sourcePath);
    links.push({
      agent: agentId,
      sourcePath,
      targetPath,
      relativePath,
      exists,
    });
  }

  return links;
}

/**
 * Create a skill link (symlink) for an agent.
 */
export async function createSkillLink(
  agentHome: string,
  sourcePath: string,
  relativePath: string,
): Promise<string> {
  const targetPath = path.join(agentHome, 'skills', relativePath);
  await fsp.mkdir(path.dirname(targetPath), { recursive: true });
  await fsp.symlink(sourcePath, targetPath);
  return targetPath;
}

/**
 * Delete a skill link (symlink) and prune empty parent directories.
 */
export async function deleteSkillLink(agentHome: string, targetPath: string): Promise<void> {
  // Remove the symlink
  try {
    await fsp.unlink(targetPath);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code !== 'ENOENT') throw err;
  }

  // Prune empty parent directories up to the agent's skills root
  const skillsRoot = path.join(agentHome, 'skills');
  let current = path.dirname(targetPath);

  while (current !== skillsRoot && current.startsWith(skillsRoot) && current !== '/') {
    try {
      const entries = await fsp.readdir(current);
      if (entries.length === 0) {
        await fsp.rmdir(current);
        current = path.dirname(current);
      } else {
        break;
      }
    } catch {
      break;
    }
  }
}

/**
 * Check if a symlink already exists at the target path.
 */
export async function skillLinkExists(targetPath: string): Promise<boolean> {
  try {
    await fsp.lstat(targetPath);
    return true;
  } catch {
    return false;
  }
}
