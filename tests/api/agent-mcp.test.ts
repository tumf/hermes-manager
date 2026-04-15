// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tempDir: string;
let agentHome: string;

vi.mock('@/src/lib/agents', () => ({
  getAgent: vi.fn(async (agentId: string) => {
    if (agentId !== 'alpha') return null;
    return {
      agentId: 'alpha',
      home: agentHome,
    };
  }),
}));

import { GET, PUT } from '../../app/api/agents/[id]/mcp/route';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

describe('/api/agents/[id]/mcp', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-agent-mcp-'));
    agentHome = path.join(tempDir, 'alpha');
    fs.mkdirSync(agentHome, { recursive: true });
    fs.writeFileSync(
      path.join(agentHome, 'config.yaml'),
      ['model:', '  default: kani/auto', 'toolsets:', '  - all', ''].join('\n'),
      'utf-8',
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('returns empty MCP content when mcp_servers is absent', async () => {
    const res = await GET(makeReq('http://localhost/api/agents/alpha/mcp'), makeContext('alpha'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe('');
    expect(body.docsUrl).toContain('use-mcp-with-hermes');
  });

  it('returns only the mcp_servers fragment when present', async () => {
    fs.writeFileSync(
      path.join(agentHome, 'config.yaml'),
      [
        'model:',
        '  default: kani/auto',
        'mcp_servers:',
        '  github:',
        '    command: npx',
        '    args:',
        '      - -y',
        '      - "@modelcontextprotocol/server-github"',
        '',
      ].join('\n'),
      'utf-8',
    );

    const res = await GET(makeReq('http://localhost/api/agents/alpha/mcp'), makeContext('alpha'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toContain('github:');
    expect(body.content).not.toContain('model:');
  });

  it('merges valid MCP content into config.yaml', async () => {
    const res = await PUT(
      makeReq('http://localhost/api/agents/alpha/mcp', {
        method: 'PUT',
        body: JSON.stringify({
          content: [
            'github:',
            '  command: npx',
            '  args:',
            '    - -y',
            '    - "@modelcontextprotocol/server-github"',
          ].join('\n'),
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeContext('alpha'),
    );

    expect(res.status).toBe(200);
    const saved = fs.readFileSync(path.join(agentHome, 'config.yaml'), 'utf-8');
    expect(saved).toContain('model:');
    expect(saved).toContain('toolsets:');
    expect(saved).toContain('mcp_servers:');
    expect(saved).toContain('github:');
  });

  it('removes mcp_servers when saving empty content', async () => {
    fs.writeFileSync(
      path.join(agentHome, 'config.yaml'),
      ['model:', '  default: kani/auto', 'mcp_servers:', '  github:', '    command: npx', ''].join(
        '\n',
      ),
      'utf-8',
    );

    const res = await PUT(
      makeReq('http://localhost/api/agents/alpha/mcp', {
        method: 'PUT',
        body: JSON.stringify({ content: '   \n' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeContext('alpha'),
    );

    expect(res.status).toBe(200);
    const saved = fs.readFileSync(path.join(agentHome, 'config.yaml'), 'utf-8');
    expect(saved).toContain('model:');
    expect(saved).not.toContain('mcp_servers:');
  });

  it('rejects invalid YAML', async () => {
    const before = fs.readFileSync(path.join(agentHome, 'config.yaml'), 'utf-8');
    const res = await PUT(
      makeReq('http://localhost/api/agents/alpha/mcp', {
        method: 'PUT',
        body: JSON.stringify({ content: 'github: [broken' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeContext('alpha'),
    );

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain('Invalid YAML');
    const after = fs.readFileSync(path.join(agentHome, 'config.yaml'), 'utf-8');
    expect(after).toBe(before);
  });

  it('rejects scalar YAML content', async () => {
    const res = await PUT(
      makeReq('http://localhost/api/agents/alpha/mcp', {
        method: 'PUT',
        body: JSON.stringify({ content: 'true' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeContext('alpha'),
    );

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain('mapping/object');
  });
});
