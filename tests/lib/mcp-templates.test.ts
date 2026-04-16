// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tempDir: string;

vi.mock('../../src/lib/runtime-paths', () => ({
  getRuntimeMcpTemplatesRootPath: (...segments: string[]) =>
    path.join(tempDir, 'mcp-templates', ...segments),
}));

import {
  McpTemplateError,
  deleteMcpTemplate,
  getMcpTemplate,
  isValidMcpTemplateName,
  listMcpTemplates,
  mcpTemplateExists,
  parseMcpTemplateContent,
  writeMcpTemplate,
} from '../../src/lib/mcp-templates';

describe('mcp-templates lib', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-mcp-templates-'));
    fs.mkdirSync(path.join(tempDir, 'mcp-templates'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('isValidMcpTemplateName', () => {
    it('accepts valid names', () => {
      expect(isValidMcpTemplateName('github-default')).toBe(true);
      expect(isValidMcpTemplateName('fs_baseline_1')).toBe(true);
    });

    it('rejects invalid names', () => {
      expect(isValidMcpTemplateName('')).toBe(false);
      expect(isValidMcpTemplateName('../escape')).toBe(false);
      expect(isValidMcpTemplateName('has space')).toBe(false);
      expect(isValidMcpTemplateName('slash/here')).toBe(false);
    });
  });

  describe('parseMcpTemplateContent', () => {
    it('parses mapping YAML', () => {
      const parsed = parseMcpTemplateContent('github:\n  command: npx\n');
      expect(parsed).toEqual({ github: { command: 'npx' } });
    });

    it('rejects invalid YAML', () => {
      expect(() => parseMcpTemplateContent('name: : :')).toThrow(McpTemplateError);
    });

    it('rejects array YAML', () => {
      expect(() => parseMcpTemplateContent('- a\n- b\n')).toThrow(McpTemplateError);
    });

    it('rejects scalar YAML', () => {
      expect(() => parseMcpTemplateContent('"just a string"')).toThrow(McpTemplateError);
    });

    it('rejects empty YAML', () => {
      expect(() => parseMcpTemplateContent('')).toThrow(McpTemplateError);
    });
  });

  describe('listMcpTemplates', () => {
    it('returns empty array when no templates exist', () => {
      expect(listMcpTemplates()).toEqual([]);
    });

    it('lists only .yaml files', () => {
      fs.writeFileSync(path.join(tempDir, 'mcp-templates', 'github-default.yaml'), 'github: {}');
      fs.writeFileSync(path.join(tempDir, 'mcp-templates', 'fs.yaml'), 'fs: {}');
      fs.writeFileSync(path.join(tempDir, 'mcp-templates', 'not-a-template.txt'), 'junk');

      expect(listMcpTemplates()).toEqual([{ name: 'fs' }, { name: 'github-default' }]);
    });

    it('skips invalid-named files', () => {
      fs.writeFileSync(path.join(tempDir, 'mcp-templates', 'has space.yaml'), 'x: 1');
      expect(listMcpTemplates()).toEqual([]);
    });
  });

  describe('getMcpTemplate / mcpTemplateExists', () => {
    it('returns stored record', () => {
      fs.writeFileSync(
        path.join(tempDir, 'mcp-templates', 'github-default.yaml'),
        'github:\n  command: npx\n',
      );
      expect(mcpTemplateExists('github-default')).toBe(true);
      expect(getMcpTemplate('github-default')).toEqual({
        name: 'github-default',
        content: 'github:\n  command: npx\n',
      });
    });

    it('returns null for missing template', () => {
      expect(getMcpTemplate('missing')).toBeNull();
      expect(mcpTemplateExists('missing')).toBe(false);
    });

    it('rejects traversal-style names', () => {
      expect(getMcpTemplate('../etc/passwd')).toBeNull();
      expect(mcpTemplateExists('../etc/passwd')).toBe(false);
    });
  });

  describe('writeMcpTemplate', () => {
    it('creates a new template file', () => {
      const record = writeMcpTemplate('github-default', 'github:\n  command: npx\n');
      expect(record.name).toBe('github-default');
      expect(record.content).toBe('github:\n  command: npx\n');

      const filePath = path.join(tempDir, 'mcp-templates', 'github-default.yaml');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('strips zero-width spaces', () => {
      const record = writeMcpTemplate('clean', 'git\u200Bhub: {}\n');
      expect(record.content).toBe('github: {}\n');
    });

    it('overwrites existing template', () => {
      writeMcpTemplate('github-default', 'github:\n  command: npx\n');
      writeMcpTemplate('github-default', 'github:\n  command: uvx\n');
      const record = getMcpTemplate('github-default');
      expect(record?.content).toBe('github:\n  command: uvx\n');
    });

    it('rejects invalid YAML', () => {
      expect(() => writeMcpTemplate('broken', 'name: : :')).toThrow(McpTemplateError);
    });

    it('rejects non-object YAML', () => {
      expect(() => writeMcpTemplate('scalar-template', '"just a string"')).toThrow(
        McpTemplateError,
      );
      expect(() => writeMcpTemplate('array-template', '- a\n- b\n')).toThrow(McpTemplateError);
    });

    it('rejects invalid template name', () => {
      expect(() => writeMcpTemplate('../evil', 'x: 1')).toThrow(McpTemplateError);
    });
  });

  describe('deleteMcpTemplate', () => {
    it('deletes an existing template', () => {
      fs.writeFileSync(path.join(tempDir, 'mcp-templates', 'fs.yaml'), 'fs: {}');
      expect(deleteMcpTemplate('fs')).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'mcp-templates', 'fs.yaml'))).toBe(false);
    });

    it('returns false when missing', () => {
      expect(deleteMcpTemplate('ghost')).toBe(false);
    });

    it('rejects traversal-style names', () => {
      expect(deleteMcpTemplate('../etc/passwd')).toBe(false);
    });
  });
});
