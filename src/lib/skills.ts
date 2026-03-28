import fs from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

/**
 * Returns the canonical skills catalog root: ~/.agents/skills
 */
export function getSkillsRoot(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.agents', 'skills');
}

/**
 * Hierarchical skill tree node with relative path and skill presence metadata
 */
export type SkillTree = {
  name: string;
  relativePath: string; // relative to catalog root
  hasSkill: boolean; // true if SKILL.md exists in this directory
  children: SkillTree[];
};

/**
 * Walk the skills catalog and return a hierarchical tree.
 * Filters out hidden entries and non-directory items.
 * Each node includes relativePath and hasSkill metadata.
 */
export function walkSkillsTree(root?: string, maxDepth = 5): SkillTree[] {
  const base = root || getSkillsRoot();

  // Check if root exists
  try {
    fs.accessSync(base);
  } catch {
    return [];
  }

  function walk(dir: string, relativePath: string, depth: number): SkillTree[] {
    if (depth > maxDepth) return [];
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return [];
    }

    const items: SkillTree[] = [];
    for (const ent of entries) {
      // Skip hidden entries (starting with .)
      if (ent.name.startsWith('.')) continue;

      // Only include directories
      if (!ent.isDirectory()) continue;

      const entryRelPath = relativePath ? `${relativePath}/${ent.name}` : ent.name;
      const fullPath = path.join(dir, ent.name);

      // Check if this directory contains SKILL.md
      const hasSkill = (() => {
        try {
          return fs.existsSync(path.join(fullPath, 'SKILL.md'));
        } catch {
          return false;
        }
      })();

      const node: SkillTree = {
        name: ent.name,
        relativePath: entryRelPath,
        hasSkill,
        children: walk(fullPath, entryRelPath, depth + 1),
      };

      items.push(node);
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  return walk(base, '', 1);
}

/**
 * Schema for creating a skill link with hierarchical relative path
 */
export const CreateLinkSchema = z.object({
  agent: z.string().min(1),
  relativePath: z.string().min(1),
});

/**
 * Derives the relative path from a source path.
 * Handles both canonical (~/.agents/skills) and legacy (~/.hermes/skills) roots.
 * Returns null if source path doesn't match a known root.
 */
export function deriveRelativePath(sourcePath: string): string | null {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const canonicalRoot = path.join(home, '.agents', 'skills');
  const legacyRoot = path.join(home, '.hermes', 'skills');

  if (sourcePath.startsWith(canonicalRoot)) {
    return path.relative(canonicalRoot, sourcePath).replace(/\\/g, '/');
  }

  if (sourcePath.startsWith(legacyRoot)) {
    return path.relative(legacyRoot, sourcePath).replace(/\\/g, '/');
  }

  return null;
}

/**
 * Resolves a relative path to the full source path in ~/.agents/skills.
 * Validates that the directory exists and contains SKILL.md.
 */
export function resolveSkillSource(relativePath: string): {
  sourcePath: string;
  isValid: boolean;
  hasSKILLMd: boolean;
} {
  const root = getSkillsRoot();
  const sourcePath = path.join(root, relativePath);

  // Ensure the path is within the root (prevent traversal)
  const normalized = path.normalize(sourcePath);
  const normalizedRoot = path.normalize(root);
  const isWithinRoot =
    normalized.startsWith(normalizedRoot + path.sep) || normalized === normalizedRoot;

  let isValid = false;
  let hasSKILLMd = false;

  if (isWithinRoot) {
    try {
      const stat = fs.statSync(sourcePath);
      isValid = stat.isDirectory();
      if (isValid) {
        hasSKILLMd = fs.existsSync(path.join(sourcePath, 'SKILL.md'));
      }
    } catch {
      isValid = false;
    }
  }

  return { sourcePath, isValid, hasSKILLMd };
}
