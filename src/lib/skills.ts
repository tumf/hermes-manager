import fs from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

export function getSkillsRoot(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.hermes', 'skills');
}

export type SkillTree = {
  name: string;
  path: string;
  isDir: boolean;
  children?: SkillTree[];
};

export function walkSkillsTree(root?: string, maxDepth = 5): SkillTree[] {
  const base = root || getSkillsRoot();
  function walk(dir: string, depth: number): SkillTree[] {
    if (depth > maxDepth) return [];
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    const items: SkillTree[] = [];
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      const node: SkillTree = { name: ent.name, path: p, isDir: ent.isDirectory(), children: [] };
      if (ent.isDirectory()) {
        node.children = walk(p, depth + 1);
      }
      items.push(node);
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }
  return walk(base, 1);
}

export const CreateLinkSchema = z.object({
  agent: z.string().min(1),
  sourcePath: z.string().min(1),
});
