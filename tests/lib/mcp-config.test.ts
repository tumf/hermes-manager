import { describe, expect, it } from 'vitest';

import { extractMcpFragment, parseMcpFragment } from '../../src/lib/mcp-config';

describe('extractMcpFragment', () => {
  it('returns empty string when mcp_servers is absent', () => {
    expect(extractMcpFragment({ name: 'alpha' })).toBe('');
  });

  it('returns empty string when mcp_servers is null', () => {
    expect(extractMcpFragment({ name: 'alpha', mcp_servers: null })).toBe('');
  });

  it('serializes mcp_servers as YAML', () => {
    const config = {
      name: 'alpha',
      mcp_servers: {
        project_fs: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem'] },
      },
    };
    const result = extractMcpFragment(config);
    expect(result).toContain('project_fs:');
    expect(result).toContain('command: npx');
    expect(result).not.toContain('name: alpha');
  });
});

describe('parseMcpFragment', () => {
  it('returns null value for empty string', () => {
    expect(parseMcpFragment('')).toEqual({ value: null });
  });

  it('returns null value for whitespace-only string', () => {
    expect(parseMcpFragment('   \n  ')).toEqual({ value: null });
  });

  it('returns error for invalid YAML', () => {
    const result = parseMcpFragment('[not: yaml');
    expect(result.error).toMatch(/Invalid YAML/);
    expect(result.value).toBeNull();
  });

  it('returns error for array YAML', () => {
    const result = parseMcpFragment('- item1\n- item2');
    expect(result.error).toMatch(/mapping\/object/);
    expect(result.value).toBeNull();
  });

  it('returns error for scalar YAML', () => {
    const result = parseMcpFragment('just a string');
    expect(result.error).toMatch(/mapping\/object/);
    expect(result.value).toBeNull();
  });

  it('parses valid mapping', () => {
    const result = parseMcpFragment('github:\n  command: npx\n');
    expect(result.error).toBeUndefined();
    expect(result.value).toEqual({ github: { command: 'npx' } });
  });
});
