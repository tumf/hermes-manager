// @vitest-environment node
import fs from 'node:fs/promises';

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, PUT } from '../../app/api/files/route';
import type { Agent } from '../../src/lib/agents';

// --- hoisted mock state ---
const mockState = vi.hoisted(() => ({
  agent: null as Agent | null,
  hasSoulSource: false,
  soulSourceWriteShouldFail: false,
  sourceWritePayload: null as null | { agentHome: string; source: string },
}));

// --- mock @/src/lib/agents ---
vi.mock('@/src/lib/agents', () => ({
  getAgent: vi.fn(async () => mockState.agent),
}));

vi.mock('@/src/lib/soul-assembly', () => {
  class MockSoulAssemblyError extends Error {
    partialName: string;

    constructor(partialName: string) {
      super(`Unknown partial reference: ${partialName}`);
      this.name = 'SoulAssemblyError';
      this.partialName = partialName;
    }
  }

  return {
    SoulAssemblyError: MockSoulAssemblyError,
    writeSoulSourceAndAssembled: vi.fn(async (agentHome: string, source: string) => {
      if (mockState.soulSourceWriteShouldFail) {
        throw new MockSoulAssemblyError('missing-partial');
      }
      mockState.sourceWritePayload = { agentHome, source };
      return { assembled: source };
    }),
  };
});

// --- mock node:fs/promises ---
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(async (targetPath: string) => {
      if (targetPath.endsWith('SOUL.src.md') && !mockState.hasSoulSource) {
        throw new Error('ENOENT');
      }

      if (targetPath.endsWith('SOUL.md')) {
        return '# Soul\n';
      }

      if (targetPath.endsWith('memories/MEMORY.md')) {
        return '# Memory\n';
      }

      if (targetPath.endsWith('SOUL.src.md')) {
        return '# Soul source\n';
      }

      throw new Error('ENOENT');
    }),
    access: vi.fn(async (targetPath: string) => {
      if (targetPath.endsWith('SOUL.src.md') && !mockState.hasSoulSource) {
        throw new Error('ENOENT');
      }
    }),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
  },
}));

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

describe('GET /api/files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agent = AGENT;
    mockState.hasSoulSource = false;
    mockState.soulSourceWriteShouldFail = false;
    mockState.sourceWritePayload = null;
  });

  it('returns file content for allowed path', async () => {
    const req = makeReq('http://localhost/api/files?agent=alpha&path=SOUL.md');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe('# Soul\n');
  });

  it('returns 404 for SOUL.src.md when partial mode is disabled', async () => {
    const req = makeReq('http://localhost/api/files?agent=alpha&path=SOUL.src.md');
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('returns SOUL.src.md content when partial mode is enabled', async () => {
    mockState.hasSoulSource = true;

    const req = makeReq('http://localhost/api/files?agent=alpha&path=SOUL.src.md');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe('# Soul source\n');
  });

  it('returns 404 when agent not found', async () => {
    mockState.agent = null;
    const req = makeReq('http://localhost/api/files?agent=ghost&path=SOUL.md');
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agent = AGENT;
    mockState.hasSoulSource = false;
    mockState.soulSourceWriteShouldFail = false;
    mockState.sourceWritePayload = null;
  });

  it('writes SOUL.md in legacy mode', async () => {
    const req = makeReq('http://localhost/api/files', {
      method: 'PUT',
      body: JSON.stringify({ agent: 'alpha', path: 'SOUL.md', content: '# Soul\n' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(vi.mocked(fs.writeFile)).toHaveBeenCalledWith(
      '/runtime/agents/alpha/SOUL.md.tmp',
      '# Soul\n',
      'utf-8',
    );
  });

  it('rejects direct SOUL.md write when SOUL.src.md exists', async () => {
    mockState.hasSoulSource = true;

    const req = makeReq('http://localhost/api/files', {
      method: 'PUT',
      body: JSON.stringify({ agent: 'alpha', path: 'SOUL.md', content: '# Soul\n' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(409);
  });

  it('writes SOUL.src.md through assembly helper', async () => {
    const req = makeReq('http://localhost/api/files', {
      method: 'PUT',
      body: JSON.stringify({
        agent: 'alpha',
        path: 'SOUL.src.md',
        content: '# Soul\n\n{{partial:shared-rules}}',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(mockState.sourceWritePayload).toEqual({
      agentHome: '/runtime/agents/alpha',
      source: '# Soul\n\n{{partial:shared-rules}}',
    });
  });

  it('returns 422 for unknown partial reference on SOUL.src.md write', async () => {
    mockState.soulSourceWriteShouldFail = true;

    const req = makeReq('http://localhost/api/files', {
      method: 'PUT',
      body: JSON.stringify({
        agent: 'alpha',
        path: 'SOUL.src.md',
        content: '{{partial:missing-partial}}',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(422);
  });

  it('returns 422 for invalid YAML in config.yaml', async () => {
    const req = makeReq('http://localhost/api/files', {
      method: 'PUT',
      body: JSON.stringify({ agent: 'alpha', path: 'config.yaml', content: '[not: yaml' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(422);
  });
});
