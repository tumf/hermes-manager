import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createSkillLink,
  deleteSkillLink,
  listSkillLinks,
  skillLinkExists,
} from '../../src/lib/skill-links';

let tmpDir: string;
let agentHome: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-links-test-'));
  agentHome = path.join(tmpDir, 'agent-home');
  fs.mkdirSync(path.join(agentHome, 'skills'), { recursive: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('listSkillLinks', () => {
  it('returns empty array when no copied skills exist', async () => {
    const links = await listSkillLinks('test-agent', agentHome);
    expect(links).toEqual([]);
  });

  it('discovers copied skill directories by presence of SKILL.md', async () => {
    const targetPath = path.join(agentHome, 'skills', 'test-skill');
    fs.mkdirSync(targetPath, { recursive: true });
    fs.writeFileSync(path.join(targetPath, 'SKILL.md'), '# Skill\n');

    const links = await listSkillLinks('test-agent', agentHome);
    expect(links).toHaveLength(1);
    expect(links[0].sourcePath).toBe(targetPath);
    expect(links[0].targetPath).toBe(targetPath);
    expect(links[0].relativePath).toBe('test-skill');
    expect(links[0].exists).toBe(true);
    expect(links[0].agent).toBe('test-agent');
  });

  it('returns nested copied skill directories with relative paths', async () => {
    const targetDir = path.join(agentHome, 'skills', 'category', 'my-skill');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'SKILL.md'), '# Skill\n');

    const links = await listSkillLinks('test-agent', agentHome);
    expect(links).toHaveLength(1);
    expect(links[0].relativePath).toBe('category/my-skill');
    expect(links[0].exists).toBe(true);
  });
});

describe('createSkillLink', () => {
  it('copies source directory to the target path', async () => {
    const sourceDir = path.join(tmpDir, 'source-skill');
    fs.mkdirSync(sourceDir);
    fs.writeFileSync(path.join(sourceDir, 'SKILL.md'), '# Skill\n');

    const targetPath = await createSkillLink(agentHome, sourceDir, 'category/my-skill');
    expect(fs.existsSync(targetPath)).toBe(true);
    expect(fs.existsSync(path.join(targetPath, 'SKILL.md'))).toBe(true);
    expect(path.relative(agentHome, targetPath)).toBe(path.join('skills', 'category', 'my-skill'));
  });

  it('creates top-level copy directory when parent does not exist', async () => {
    const sourceDir = path.join(tmpDir, 'source-skill');
    fs.mkdirSync(sourceDir);
    fs.writeFileSync(path.join(sourceDir, 'SKILL.md'), '# Skill\n');

    const targetPath = await createSkillLink(agentHome, sourceDir, 'new-folder/leaf');
    expect(targetPath).toBe(path.join(agentHome, 'skills', 'new-folder', 'leaf'));
    expect(fs.existsSync(targetPath)).toBe(true);
    expect(fs.existsSync(path.join(targetPath, 'SKILL.md'))).toBe(true);
  });
});

describe('deleteSkillLink', () => {
  it('removes copied directory and prunes empty parents', async () => {
    const targetPath = path.join(agentHome, 'skills', 'category', 'my-skill');
    fs.mkdirSync(targetPath, { recursive: true });
    fs.writeFileSync(path.join(targetPath, 'SKILL.md'), '# Skill\n');

    await deleteSkillLink(agentHome, targetPath);
    expect(fs.existsSync(targetPath)).toBe(false);
    expect(fs.existsSync(path.join(agentHome, 'skills', 'category'))).toBe(false);
  });

  it('removes non-empty copied directory and prunes empty parents', async () => {
    const targetPath = path.join(agentHome, 'skills', 'category', 'non-empty');
    fs.mkdirSync(targetPath, { recursive: true });
    fs.writeFileSync(path.join(targetPath, 'SKILL.md'), '# Skill\n');
    fs.writeFileSync(path.join(targetPath, 'nested.txt'), 'x');

    await expect(deleteSkillLink(agentHome, targetPath)).resolves.toBeUndefined();
    expect(fs.existsSync(targetPath)).toBe(false);
    expect(fs.existsSync(path.join(agentHome, 'skills', 'category'))).toBe(false);
  });

  it('does not error when directory does not exist', async () => {
    const targetPath = path.join(agentHome, 'skills', 'nonexistent');
    await expect(deleteSkillLink(agentHome, targetPath)).resolves.toBeUndefined();
  });
});

describe('skillLinkExists', () => {
  it('returns true when copied directory exists', async () => {
    const targetPath = path.join(agentHome, 'skills', 'test');
    fs.mkdirSync(targetPath, { recursive: true });

    expect(await skillLinkExists(targetPath)).toBe(true);
  });

  it('returns false when copied directory missing', async () => {
    expect(await skillLinkExists(path.join(agentHome, 'skills', 'missing'))).toBe(false);
  });
});
