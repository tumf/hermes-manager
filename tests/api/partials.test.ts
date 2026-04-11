// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tempDir: string;

const mockState = vi.hoisted(() => ({
  partials: new Map<string, string>(),
  usedBy: new Map<string, string[]>(),
  rebuildCalls: [] as string[],
}));

vi.mock('../../src/lib/runtime-paths', () => ({
  getRuntimeAgentsRootPath: (...segments: string[]) => path.join(tempDir, 'agents', ...segments),
  getRuntimePartialsRootPath: (...segments: string[]) =>
    path.join(tempDir, 'partials', ...segments),
}));

vi.mock('../../src/lib/partials', () => ({
  isValidPartialName: (name: string) => /^[a-zA-Z0-9_-]+$/.test(name),
  listPartialNames: vi.fn(async () =>
    [...mockState.partials.keys()].sort((a, b) => a.localeCompare(b)),
  ),
  readPartial: vi.fn(async (name: string) => mockState.partials.get(name) ?? null),
  writePartial: vi.fn(async (name: string, content: string) => {
    mockState.partials.set(name, content);
  }),
  deletePartial: vi.fn(async (name: string) => mockState.partials.delete(name)),
  findAgentsUsingPartial: vi.fn(async (name: string) => mockState.usedBy.get(name) ?? []),
}));

vi.mock('../../src/lib/soul-assembly', () => ({
  rebuildSoulForAgent: vi.fn(async (agentHome: string) => {
    mockState.rebuildCalls.push(agentHome);
    return true;
  }),
}));

import { DELETE, GET, POST, PUT } from '../../app/api/partials/route';

function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

describe('/api/partials', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-partials-api-'));
    fs.mkdirSync(path.join(tempDir, 'partials'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'agents'), { recursive: true });

    vi.clearAllMocks();
    mockState.partials.clear();
    mockState.usedBy.clear();
    mockState.rebuildCalls = [];

    mockState.partials.set('shared-rules', '## Shared Rules');
    mockState.usedBy.set('shared-rules', ['alpha']);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('lists partials with usage', async () => {
    const res = await GET(makeReq('http://localhost/api/partials'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([
      {
        name: 'shared-rules',
        content: '## Shared Rules',
        usedBy: ['alpha'],
      },
    ]);
  });

  it('returns a single partial by name', async () => {
    const res = await GET(makeReq('http://localhost/api/partials?name=shared-rules'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('shared-rules');
    expect(body.usedBy).toEqual(['alpha']);
  });

  it('creates partial and returns rebuilt agents', async () => {
    mockState.usedBy.set('new-partial', ['beta']);

    const req = makeReq('http://localhost/api/partials', {
      method: 'POST',
      body: JSON.stringify({ name: 'new-partial', content: '# New' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.rebuiltAgents).toEqual(['beta']);
    expect(mockState.partials.get('new-partial')).toBe('# New');
  });

  it('strips zero-width spaces when creating partials', async () => {
    const req = makeReq('http://localhost/api/partials', {
      method: 'POST',
      body: JSON.stringify({ name: 'new-partial', content: '# Ne\u200Bw' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockState.partials.get('new-partial')).toBe('# New');
  });

  it('updates existing partial and triggers rebuild', async () => {
    const req = makeReq('http://localhost/api/partials', {
      method: 'PUT',
      body: JSON.stringify({ name: 'shared-rules', content: '# Updated' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rebuiltAgents).toEqual(['alpha']);
    expect(mockState.partials.get('shared-rules')).toBe('# Updated');
  });

  it('strips zero-width spaces when updating partials', async () => {
    const req = makeReq('http://localhost/api/partials', {
      method: 'PUT',
      body: JSON.stringify({ name: 'shared-rules', content: '# Upda\u200Bted' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(mockState.partials.get('shared-rules')).toBe('# Updated');
  });

  it('returns 409 when deleting in-use partial', async () => {
    const res = await DELETE(
      makeReq('http://localhost/api/partials?name=shared-rules', { method: 'DELETE' }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.usedBy).toEqual(['alpha']);
  });

  it('deletes unused partial', async () => {
    mockState.partials.set('unused', '# Unused');
    mockState.usedBy.set('unused', []);

    const res = await DELETE(
      makeReq('http://localhost/api/partials?name=unused', { method: 'DELETE' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockState.partials.has('unused')).toBe(false);
  });
});
