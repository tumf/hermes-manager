// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock runtime-paths to use a temp directory
let tempDir: string;

vi.mock('../../src/lib/runtime-paths', () => ({
  getRuntimeTemplatesRootPath: (...segments: string[]) => {
    return path.join(tempDir, 'templates', ...segments);
  },
}));

import {
  deleteTemplate,
  deleteTemplateFile,
  getTemplateFile,
  isValidFileName,
  isValidName,
  listTemplates,
  resolveTemplateContent,
  writeTemplateFile,
} from '../../src/lib/templates';

describe('templates lib', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-templates-test-'));
    fs.mkdirSync(path.join(tempDir, 'templates'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('isValidName', () => {
    it('accepts valid names', () => {
      expect(isValidName('default')).toBe(true);
      expect(isValidName('telegram-bot')).toBe(true);
      expect(isValidName('my_template_1')).toBe(true);
    });

    it('rejects invalid names', () => {
      expect(isValidName('')).toBe(false);
      expect(isValidName('bad name')).toBe(false);
      expect(isValidName('../evil')).toBe(false);
      expect(isValidName('foo/bar')).toBe(false);
    });
  });

  describe('isValidFileName', () => {
    it('accepts allowed file names', () => {
      expect(isValidFileName('AGENTS.md')).toBe(true);
      expect(isValidFileName('SOUL.md')).toBe(true);
      expect(isValidFileName('config.yaml')).toBe(true);
    });

    it('rejects disallowed file names', () => {
      expect(isValidFileName('other.txt')).toBe(false);
      expect(isValidFileName('')).toBe(false);
    });
  });

  describe('listTemplates', () => {
    it('returns empty array when no templates exist', () => {
      expect(listTemplates()).toEqual([]);
    });

    it('lists templates with their files', () => {
      const defaultDir = path.join(tempDir, 'templates', 'default');
      fs.mkdirSync(defaultDir, { recursive: true });
      fs.writeFileSync(path.join(defaultDir, 'AGENTS.md'), '# Agent');
      fs.writeFileSync(path.join(defaultDir, 'config.yaml'), 'name: test');

      const botDir = path.join(tempDir, 'templates', 'telegram-bot');
      fs.mkdirSync(botDir, { recursive: true });
      fs.writeFileSync(path.join(botDir, 'AGENTS.md'), '# Bot');

      const result = listTemplates();
      expect(result).toEqual([
        { name: 'default', files: ['AGENTS.md', 'config.yaml'] },
        { name: 'telegram-bot', files: ['AGENTS.md'] },
      ]);
    });

    it('ignores non-directory entries', () => {
      fs.writeFileSync(path.join(tempDir, 'templates', 'stray-file.txt'), 'junk');
      expect(listTemplates()).toEqual([]);
    });
  });

  describe('getTemplateFile', () => {
    it('returns file content when file exists', () => {
      const dir = path.join(tempDir, 'templates', 'default');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Test Content');

      const result = getTemplateFile('default', 'AGENTS.md');
      expect(result).toEqual({
        name: 'default',
        file: 'AGENTS.md',
        content: '# Test Content',
      });
    });

    it('returns null when file does not exist', () => {
      expect(getTemplateFile('nonexistent', 'AGENTS.md')).toBeNull();
    });
  });

  describe('writeTemplateFile', () => {
    it('creates file and directory if needed', () => {
      const result = writeTemplateFile('new-template', 'config.yaml', 'name: bot\n');
      expect(result).toEqual({
        name: 'new-template',
        file: 'config.yaml',
        content: 'name: bot\n',
      });

      const filePath = path.join(tempDir, 'templates', 'new-template', 'config.yaml');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('name: bot\n');
    });

    it('overwrites existing file', () => {
      const dir = path.join(tempDir, 'templates', 'default');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Old');

      writeTemplateFile('default', 'AGENTS.md', '# Updated');
      expect(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf-8')).toBe('# Updated');
    });
  });

  describe('deleteTemplateFile', () => {
    it('deletes a single file', () => {
      const dir = path.join(tempDir, 'templates', 'test');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Test');
      fs.writeFileSync(path.join(dir, 'config.yaml'), 'name: test');

      expect(deleteTemplateFile('test', 'AGENTS.md')).toBe(true);
      expect(fs.existsSync(path.join(dir, 'AGENTS.md'))).toBe(false);
      // Directory and other files remain
      expect(fs.existsSync(path.join(dir, 'config.yaml'))).toBe(true);
    });

    it('returns false when file does not exist', () => {
      expect(deleteTemplateFile('nonexistent', 'AGENTS.md')).toBe(false);
    });
  });

  describe('deleteTemplate', () => {
    it('deletes entire directory', () => {
      const dir = path.join(tempDir, 'templates', 'old-template');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Old');
      fs.writeFileSync(path.join(dir, 'config.yaml'), 'name: old');

      expect(deleteTemplate('old-template')).toBe(true);
      expect(fs.existsSync(dir)).toBe(false);
    });

    it('returns false when directory does not exist', () => {
      expect(deleteTemplate('ghost')).toBe(false);
    });
  });

  describe('resolveTemplateContent', () => {
    it('resolves from specified template', () => {
      const dir = path.join(tempDir, 'templates', 'custom');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Custom Agent');

      expect(resolveTemplateContent('AGENTS.md', 'test-id', 'custom')).toBe('# Custom Agent');
    });

    it('falls back to default when specified template missing', () => {
      const dir = path.join(tempDir, 'templates', 'default');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Default Agent');

      expect(resolveTemplateContent('AGENTS.md', 'test-id', 'nonexistent')).toBe('# Default Agent');
    });

    it('falls back to hardcoded content when no templates exist', () => {
      expect(resolveTemplateContent('AGENTS.md', 'abc1234')).toBe('# abc1234\n');
      expect(resolveTemplateContent('SOUL.md', 'abc1234')).toBe('# Soul: abc1234\n');
      expect(resolveTemplateContent('config.yaml', 'abc1234')).toBe('name: abc1234\n');
    });

    it('uses default template when no template name specified', () => {
      const dir = path.join(tempDir, 'templates', 'default');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'SOUL.md'), '# Default Soul');

      expect(resolveTemplateContent('SOUL.md', 'test-id')).toBe('# Default Soul');
    });
  });
});
