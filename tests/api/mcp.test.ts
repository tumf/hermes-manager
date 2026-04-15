// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, PUT } from '../../app/api/agents/[id]/mcp/route';
import type { Agent } from '../../src/lib/agents';

const mockState = vi.hoisted(() => ({
  agent: null as Agent | null,
  configContent: '' as string,
}));

vi.mock('@/src/lib/agents', () => ({
  getAgent: vi.fn(async () => mockState.agent),
}));

vi.mock('@/src/lib/mcp-config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/mcp-config')>();
  return {
    ...actual,
    readMcpConfig: vi.fn(async () => mockState.configContent),
    writeMcpConfig: vi.fn(async (_home: string, content: string) => {
      const { parseMcpFragment } = actual;
      const trimmed = content.trim();
      if (trimmed === '') {
        mockState.configContent = '';
        return {};
      }
      const result = parseMcpFragment(content);
      if (result.error) return { error: result.error };
      mockState.configContent = content;
      return {};
    }),
  };
});

function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

const AGENT: Agent = {
  agentId: 'alpha',
  home: '/runtime/agents/alpha',
  label: 'ai.hermes.gateway.alpha',
  enabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  name: '',
  description: '',
  tags: [],
  apiServerStatus: 'disabled',
  apiServerAvailable: false,
  apiServerPort: null,
  memoryRssBytes: null,
  hermesVersion: null,
};

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/agents/[id]/mcp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agent = AGENT;
    mockState.configContent = '';
  });

  it('returns 404 when agent not found', async () => {
    mockState.agent = null;
    const req = makeReq('http://localhost/api/agents/ghost/mcp');
    const res = await GET(req, makeContext('ghost'));
    expect(res.status).toBe(404);
  });

  it('returns empty content when no mcp_servers', async () => {
    const req = makeReq('http://localhost/api/agents/alpha/mcp');
    const res = await GET(req, makeContext('alpha'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe('');
    expect(body.docsUrl).toContain('hermes-agent.nousresearch.com');
  });

  it('returns mcp_servers content when present', async () => {
    mockState.configContent = 'github:\n  command: npx\n';
    const req = makeReq('http://localhost/api/agents/alpha/mcp');
    const res = await GET(req, makeContext('alpha'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe('github:\n  command: npx\n');
  });
});

describe('PUT /api/agents/[id]/mcp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agent = AGENT;
    mockState.configContent = '';
  });

  it('returns 404 when agent not found', async () => {
    mockState.agent = null;
    const req = makeReq('http://localhost/api/agents/ghost/mcp', {
      method: 'PUT',
      body: JSON.stringify({ content: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, makeContext('ghost'));
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = makeReq('http://localhost/api/agents/alpha/mcp', {
      method: 'PUT',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, makeContext('alpha'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when content field is missing', async () => {
    const req = makeReq('http://localhost/api/agents/alpha/mcp', {
      method: 'PUT',
      body: JSON.stringify({ wrong: 'field' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, makeContext('alpha'));
    expect(res.status).toBe(400);
  });

  it('returns 422 for invalid YAML', async () => {
    const req = makeReq('http://localhost/api/agents/alpha/mcp', {
      method: 'PUT',
      body: JSON.stringify({ content: '[not: yaml' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, makeContext('alpha'));
    expect(res.status).toBe(422);
  });

  it('returns 422 for non-object YAML', async () => {
    const req = makeReq('http://localhost/api/agents/alpha/mcp', {
      method: 'PUT',
      body: JSON.stringify({ content: '- item1\n- item2' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, makeContext('alpha'));
    expect(res.status).toBe(422);
  });

  it('saves valid MCP config', async () => {
    const req = makeReq('http://localhost/api/agents/alpha/mcp', {
      method: 'PUT',
      body: JSON.stringify({ content: 'github:\n  command: npx\n' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, makeContext('alpha'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('accepts empty content to remove mcp_servers', async () => {
    const req = makeReq('http://localhost/api/agents/alpha/mcp', {
      method: 'PUT',
      body: JSON.stringify({ content: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, makeContext('alpha'));
    expect(res.status).toBe(200);
  });
});
