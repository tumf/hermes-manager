// @vitest-environment node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../../app/api/logs/route';
import type { Agent } from '../../src/lib/agents';
import { readLastNLines, LogQuerySchema } from '@/src/lib/logs';

// --- hoisted mock state ---
const mockState = vi.hoisted(() => ({
  agent: null as Agent | null,
}));

// --- mock @/src/lib/agents ---
vi.mock('@/src/lib/agents', () => ({
  getAgent: vi.fn(async () => mockState.agent),
}));

function makeReq(url: string) {
  return new NextRequest(url);
}

// -----------------------------------------------------------------------
// Unit tests for readLastNLines helper
// -----------------------------------------------------------------------

describe('readLastNLines', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'logs-test-'));
  });

  it('returns empty result when file does not exist', async () => {
    const result = await readLastNLines(path.join(tmpDir, 'missing.log'), 100);
    expect(result).toEqual({ lines: [], totalBytes: 0 });
  });

  it('returns all lines when file has fewer lines than n', async () => {
    const filePath = path.join(tmpDir, 'small.log');
    await fs.writeFile(filePath, 'line1\nline2\nline3\n');
    const result = await readLastNLines(filePath, 100);
    expect(result.lines).toEqual(['line1', 'line2', 'line3']);
    expect(result.totalBytes).toBeGreaterThan(0);
  });

  it('returns exactly n lines when file has more lines', async () => {
    const filePath = path.join(tmpDir, 'large.log');
    const totalLines = 50;
    const content = Array.from({ length: totalLines }, (_, i) => `line${i + 1}`).join('\n') + '\n';
    await fs.writeFile(filePath, content);
    const result = await readLastNLines(filePath, 10);
    expect(result.lines).toHaveLength(10);
    expect(result.lines[result.lines.length - 1]).toBe('line50');
  });

  it('caps at 1000 lines via LogQuerySchema', () => {
    const result = LogQuerySchema.safeParse({
      agent: 'alice',
      file: 'gateway.log',
      lines: '5000',
    });
    expect(result.success).toBe(false);
  });

  it('returns totalBytes equal to file size', async () => {
    const filePath = path.join(tmpDir, 'sized.log');
    const content = 'hello\nworld\n';
    await fs.writeFile(filePath, content);
    const result = await readLastNLines(filePath, 100);
    const stat = await fs.stat(filePath);
    expect(result.totalBytes).toBe(stat.size);
  });
});

// -----------------------------------------------------------------------
// Unit tests for GET /api/logs validation
// -----------------------------------------------------------------------

describe('LogQuerySchema file enum validation', () => {
  it('rejects disallowed filename', () => {
    const result = LogQuerySchema.safeParse({
      agent: 'alice',
      file: 'secrets.txt',
      lines: undefined,
    });
    expect(result.success).toBe(false);
  });

  it('accepts allowed filenames', () => {
    for (const file of ['gateway.log', 'gateway.error.log', 'errors.log'] as const) {
      const result = LogQuerySchema.safeParse({ agent: 'alice', file });
      expect(result.success).toBe(true);
    }
  });

  it('defaults lines to 200', () => {
    const result = LogQuerySchema.safeParse({ agent: 'alice', file: 'gateway.log' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.lines).toBe(200);
  });
});

// -----------------------------------------------------------------------
// Integration tests for GET /api/logs route handler
// -----------------------------------------------------------------------

describe('GET /api/logs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.agent = null;
  });

  it('returns 400 for disallowed file', async () => {
    const req = makeReq('http://localhost/api/logs?agent=alice&file=secrets.txt');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when agent param is missing', async () => {
    const req = makeReq('http://localhost/api/logs?file=gateway.log');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when agent is not found', async () => {
    mockState.agent = null;
    const req = makeReq('http://localhost/api/logs?agent=ghost&file=gateway.log');
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('returns empty result when log file does not exist', async () => {
    mockState.agent = {
      agentId: 'alice',
      home: '/nonexistent/runtime/agents/alice',
      label: 'ai.hermes.gateway.alice',
      enabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      name: '',
      description: '',
      tags: [],
      apiServerAvailable: false,
      apiServerPort: null,
    };
    const req = makeReq('http://localhost/api/logs?agent=alice&file=gateway.log');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ lines: [], totalBytes: 0 });
  });
});
