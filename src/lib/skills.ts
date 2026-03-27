import fs from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

export interface SkillNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: SkillNode[];
}

export function walkSkillsTree(root: string, maxDepth = 5, currentDepth = 0): SkillNode[] {
  if (currentDepth >= maxDepth) return [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries.map((entry) => {
    const entryPath = path.join(root, entry.name);
    const isDir = entry.isDirectory();
    const node: SkillNode = { name: entry.name, path: entryPath, isDir };
    if (isDir) {
      node.children = walkSkillsTree(entryPath, maxDepth, currentDepth + 1);
    }
    return node;
  });
}

export function getSkillsRoot(): string {
  const hermesHome = process.env.HERMES_HOME ?? path.join(process.env.HOME ?? '~', '.hermes');
  return path.join(hermesHome, 'skills');
}

// Zod schemas

export const CreateLinkSchema = z.object({
  agent: z.string().min(1),
  sourcePath: z.string().min(1),
});

export const TreeResponseSchema = z.object({
  tree: z.array(z.lazy(() => SkillNodeSchema)),
});

export const SkillNodeSchema: z.ZodType<SkillNode> = z.lazy(() =>
  z.object({
    name: z.string(),
    path: z.string(),
    isDir: z.boolean(),
    children: z.array(SkillNodeSchema).optional(),
  }),
);

export const LinkRowSchema = z.object({
  id: z.number(),
  agent: z.string(),
  sourcePath: z.string(),
  targetPath: z.string(),
  exists: z.boolean(),
});
