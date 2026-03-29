import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import { deriveRelativePath } from './skills';

const HYBRID_LINK_NAME = '.skill-link';

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
      continue;
    }
    if (!entry.isDirectory()) {
      continue;
    }

    const hybridLinkPath = path.join(fullPath, HYBRID_LINK_NAME);
    try {
      const hybridStat = await fsp.lstat(hybridLinkPath);
      if (hybridStat.isSymbolicLink()) {
        result.push(hybridLinkPath);
      }
    } catch {
      undefined;
    }

    const nested = await findSymlinks(fullPath);
    result.push(...nested.filter((nestedPath) => nestedPath !== hybridLinkPath));
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

    const derivedRelativePath = deriveRelativePath(sourcePath);
    const relativePath =
      derivedRelativePath ||
      (path.basename(targetPath) === HYBRID_LINK_NAME
        ? path.relative(skillsDir, path.dirname(targetPath)).replace(/\\/g, '/')
        : path.basename(sourcePath));
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
  const directTargetPath = path.join(agentHome, 'skills', relativePath);

  try {
    const stat = await fsp.lstat(directTargetPath);
    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      const hybridTargetPath = path.join(directTargetPath, HYBRID_LINK_NAME);
      await fsp.mkdir(directTargetPath, { recursive: true });
      await fsp.symlink(sourcePath, hybridTargetPath);
      return hybridTargetPath;
    }
  } catch {
    undefined;
  }

  await fsp.mkdir(path.dirname(directTargetPath), { recursive: true });

  try {
    await fsp.symlink(sourcePath, directTargetPath);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'EEXIST') {
      const stat = await fsp.lstat(directTargetPath);
      if (stat.isDirectory() && !stat.isSymbolicLink()) {
        const hybridTargetPath = path.join(directTargetPath, HYBRID_LINK_NAME);
        await fsp.symlink(sourcePath, hybridTargetPath);
        return hybridTargetPath;
      }
    }
    throw err;
  }
  return directTargetPath;
}

/**
 * Delete a skill link (symlink) and prune empty parent directories.
 */
export async function deleteSkillLink(agentHome: string, targetPath: string): Promise<void> {
  let removedPath = targetPath;
  try {
    const stat = await fsp.lstat(targetPath);
    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      const hybridTargetPath = path.join(targetPath, HYBRID_LINK_NAME);
      try {
        const hybridStat = await fsp.lstat(hybridTargetPath);
        if (hybridStat.isSymbolicLink()) {
          await fsp.unlink(hybridTargetPath);
          removedPath = hybridTargetPath;
        } else {
          throw new Error('target path is a non-empty directory');
        }
      } catch (err: unknown) {
        const e = err as { code?: string };
        if (e.code === 'ENOENT') {
          const entries = await fsp.readdir(targetPath);
          if (entries.length > 0) {
            throw new Error('target path is a non-empty directory');
          }
          await fsp.rmdir(targetPath);
        } else {
          throw err;
        }
      }
    } else {
      await fsp.unlink(targetPath);
    }
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code !== 'ENOENT') throw err;
  }

  const skillsRoot = path.join(agentHome, 'skills');
  let current = path.dirname(removedPath);

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
    try {
      const hybridTargetPath = path.join(targetPath, HYBRID_LINK_NAME);
      const stat = await fsp.lstat(hybridTargetPath);
      return stat.isSymbolicLink();
    } catch {
      return false;
    }
  }
}
