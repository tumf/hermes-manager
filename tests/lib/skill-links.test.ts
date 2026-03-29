import fs from 'node:fs';
import fsp from 'node:fs/promises';
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
  it('returns empty array when no symlinks exist', async () => {
    const links = await listSkillLinks('test-agent', agentHome);
    expect(links).toEqual([]);
  });

  it('returns symlinks with existence status', async () => {
    // Create a real directory to symlink to
    const sourceDir = path.join(tmpDir, 'source-skill');
    fs.mkdirSync(sourceDir);
    fs.writeFileSync(path.join(sourceDir, 'SKILL.md'), '# Skill\n');

    // Create symlink
    const targetPath = path.join(agentHome, 'skills', 'test-skill');
    fs.symlinkSync(sourceDir, targetPath);

    const links = await listSkillLinks('test-agent', agentHome);
    expect(links).toHaveLength(1);
    expect(links[0].sourcePath).toBe(sourceDir);
    expect(links[0].targetPath).toBe(targetPath);
    expect(links[0].exists).toBe(true);
    expect(links[0].agent).toBe('test-agent');
  });

  it('marks broken symlinks as exists: false', async () => {
    // Create a symlink pointing to a nonexistent location
    const targetPath = path.join(agentHome, 'skills', 'broken');
    fs.symlinkSync('/nonexistent/path', targetPath);

    const links = await listSkillLinks('test-agent', agentHome);
    expect(links).toHaveLength(1);
    expect(links[0].exists).toBe(false);
  });
});

describe('createSkillLink', () => {
  it('creates a symlink at the target path', async () => {
    const sourceDir = path.join(tmpDir, 'source-skill');
    fs.mkdirSync(sourceDir);

    const targetPath = await createSkillLink(agentHome, sourceDir, 'category/my-skill');
    expect(fs.lstatSync(targetPath).isSymbolicLink()).toBe(true);
    expect(fs.readlinkSync(targetPath)).toBe(sourceDir);
  });
});

describe('deleteSkillLink', () => {
  it('removes the symlink and prunes empty parents', async () => {
    const sourceDir = path.join(tmpDir, 'source-skill');
    fs.mkdirSync(sourceDir);

    const targetPath = path.join(agentHome, 'skills', 'category', 'my-skill');
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.symlinkSync(sourceDir, targetPath);

    await deleteSkillLink(agentHome, targetPath);
    expect(fs.existsSync(targetPath)).toBe(false);
    // Parent 'category' directory should also be removed (empty after symlink removal)
    expect(fs.existsSync(path.join(agentHome, 'skills', 'category'))).toBe(false);
  });

  it('does not error when symlink does not exist', async () => {
    const targetPath = path.join(agentHome, 'skills', 'nonexistent');
    await expect(deleteSkillLink(agentHome, targetPath)).resolves.toBeUndefined();
  });
});

describe('skillLinkExists', () => {
  it('returns true when symlink exists', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    fs.mkdirSync(sourceDir);
    const targetPath = path.join(agentHome, 'skills', 'test');
    fs.symlinkSync(sourceDir, targetPath);

    expect(await skillLinkExists(targetPath)).toBe(true);
  });

  it('returns false when no file exists', async () => {
    expect(await skillLinkExists(path.join(agentHome, 'skills', 'missing'))).toBe(false);
  });
});
