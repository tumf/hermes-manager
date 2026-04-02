import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

export interface SkillLink {
  agent: string;
  sourcePath: string;
  targetPath: string;
  relativePath: string;
  exists: boolean;
}

function isWithinRoot(root: string, candidate: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  return (
    resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)
  );
}

async function scanSkillDirectories(
  dir: string,
  skillsRoot: string,
  agentId: string,
): Promise<SkillLink[]> {
  let rawEntries: fs.Dirent[] = [];
  try {
    rawEntries = (await fsp.readdir(dir, { withFileTypes: true })) as fs.Dirent[];
  } catch {
    return [];
  }

  const links: SkillLink[] = [];

  for (const entry of rawEntries) {
    const entryName = entry.name.toString();
    if (entryName.startsWith('.')) {
      continue;
    }

    if (!entry.isDirectory()) {
      continue;
    }

    const fullPath = path.join(dir, entryName);

    const skillFilePath = path.join(fullPath, 'SKILL.md');
    let hasSkill = false;
    try {
      const skillFileStat = await fsp.stat(skillFilePath);
      hasSkill = skillFileStat.isFile();
    } catch {
      hasSkill = false;
    }

    if (hasSkill && isWithinRoot(skillsRoot, fullPath)) {
      const relativePath = path.relative(skillsRoot, fullPath).replace(/\\/g, '/');
      if (relativePath) {
        links.push({
          agent: agentId,
          sourcePath: fullPath,
          targetPath: fullPath,
          relativePath,
          exists: true,
        });
      }
    }

    const nested = await scanSkillDirectories(fullPath, skillsRoot, agentId);
    links.push(...nested);
  }

  return links;
}

/**
 * List equipped skills for an agent by scanning copied directories under skills/.
 */
export async function listSkillLinks(agentId: string, agentHome: string): Promise<SkillLink[]> {
  const skillsDir = path.join(agentHome, 'skills');
  const links = await scanSkillDirectories(skillsDir, skillsDir, agentId);
  return links.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

/**
 * Copy a skill directory into an agent's skills directory.
 */
export async function createSkillLink(
  agentHome: string,
  sourcePath: string,
  relativePath: string,
): Promise<string> {
  const skillsRoot = path.join(agentHome, 'skills');
  const targetPath = path.join(skillsRoot, relativePath);

  if (!isWithinRoot(skillsRoot, targetPath)) {
    throw new Error('target path escapes skills root');
  }

  const sourceStat = await fsp.stat(sourcePath);
  if (!sourceStat.isDirectory()) {
    throw new Error('source must be a directory');
  }

  const sourceSkillPath = path.join(sourcePath, 'SKILL.md');
  const sourceSkillStat = await fsp.stat(sourceSkillPath);
  if (!sourceSkillStat.isFile()) {
    throw new Error('source directory does not contain SKILL.md');
  }

  try {
    await fsp.lstat(targetPath);
    const error = new Error('target already exists') as Error & { code?: string };
    error.code = 'EEXIST';
    throw error;
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code !== 'ENOENT') {
      throw err;
    }
  }

  await fsp.mkdir(path.dirname(targetPath), { recursive: true });
  await fsp.cp(sourcePath, targetPath, { recursive: true });

  return targetPath;
}

/**
 * Delete an equipped copied skill directory and prune empty ancestors.
 */
export async function deleteSkillLink(agentHome: string, targetPath: string): Promise<void> {
  const skillsRoot = path.join(agentHome, 'skills');

  if (!isWithinRoot(skillsRoot, targetPath)) {
    throw new Error('target path escapes skills root');
  }

  await fsp.rm(targetPath, { recursive: true, force: true });

  let current = path.dirname(targetPath);
  while (current !== skillsRoot && isWithinRoot(skillsRoot, current)) {
    const entries = await fsp.readdir(current);
    if (entries.length > 0) {
      break;
    }
    await fsp.rmdir(current);
    current = path.dirname(current);
  }
}

/**
 * Check whether a copied skill directory exists at target path.
 */
export async function skillLinkExists(targetPath: string): Promise<boolean> {
  try {
    const stat = await fsp.lstat(targetPath);
    return stat.isDirectory() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}
