// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tempDir: string;

vi.mock('../../src/lib/runtime-paths', () => ({
  getRuntimeMcpTemplatesRootPath: (...segments: string[]) =>
    path.join(tempDir, 'mcp-templates', ...segments),
}));

import { DELETE, GET, POST, PUT } from '../../app/api/mcp-templates/route';

function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

describe('GET /api/mcp-templates', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-mcp-tpl-api-'));
    fs.mkdirSync(path.join(tempDir, 'mcp-templates'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns empty array when no templates', async () => {
    const res = await GET(makeReq('http://localhost/api/mcp-templates'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('lists saved MCP templates', async () => {
    fs.writeFileSync(path.join(tempDir, 'mcp-templates', 'github-default.yaml'), 'github: {}\n');
    fs.writeFileSync(path.join(tempDir, 'mcp-templates', 'filesystem-default.yaml'), 'fs: {}\n');

    const res = await GET(makeReq('http://localhost/api/mcp-templates'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ name: 'filesystem-default' }, { name: 'github-default' }]);
  });

  it('returns specific template content', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'mcp-templates', 'github-default.yaml'),
      'github:\n  command: npx\n',
    );
    const res = await GET(makeReq('http://localhost/api/mcp-templates?name=github-default'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      name: 'github-default',
      content: 'github:\n  command: npx\n',
    });
  });

  it('returns 404 when template missing', async () => {
    const res = await GET(makeReq('http://localhost/api/mcp-templates?name=ghost'));
    expect(res.status).toBe(404);
  });

  it('returns 400 when name is invalid', async () => {
    const res = await GET(makeReq('http://localhost/api/mcp-templates?name=../evil'));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/mcp-templates', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-mcp-tpl-api-'));
    fs.mkdirSync(path.join(tempDir, 'mcp-templates'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates a new MCP template', async () => {
    const res = await POST(
      makeReq('http://localhost/api/mcp-templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'github-default',
          content: 'github:\n  command: npx\n',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      name: 'github-default',
      content: 'github:\n  command: npx\n',
    });
    expect(fs.existsSync(path.join(tempDir, 'mcp-templates', 'github-default.yaml'))).toBe(true);
  });

  it('returns 409 on duplicate', async () => {
    fs.writeFileSync(path.join(tempDir, 'mcp-templates', 'github-default.yaml'), 'github: {}');
    const res = await POST(
      makeReq('http://localhost/api/mcp-templates', {
        method: 'POST',
        body: JSON.stringify({ name: 'github-default', content: 'github: {}' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(409);
  });

  it('returns 422 for invalid YAML', async () => {
    const res = await POST(
      makeReq('http://localhost/api/mcp-templates', {
        method: 'POST',
        body: JSON.stringify({ name: 'broken', content: 'name: : :' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(422);
  });

  it('returns 422 for non-object YAML', async () => {
    const res = await POST(
      makeReq('http://localhost/api/mcp-templates', {
        method: 'POST',
        body: JSON.stringify({ name: 'scalar-template', content: '"hello"' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/mapping|object/i);
  });

  it('returns 422 for array YAML', async () => {
    const res = await POST(
      makeReq('http://localhost/api/mcp-templates', {
        method: 'POST',
        body: JSON.stringify({ name: 'array-template', content: '- a\n- b\n' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(422);
  });

  it('returns 400 for invalid name', async () => {
    const res = await POST(
      makeReq('http://localhost/api/mcp-templates', {
        method: 'POST',
        body: JSON.stringify({ name: 'bad name!', content: 'a: 1' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    const res = await POST(
      makeReq('http://localhost/api/mcp-templates', {
        method: 'POST',
        body: 'not json',
        headers: { 'Content-Type': 'text/plain' },
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/mcp-templates', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-mcp-tpl-api-'));
    fs.mkdirSync(path.join(tempDir, 'mcp-templates'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('updates existing template', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'mcp-templates', 'github-default.yaml'),
      'github:\n  command: npx\n',
    );
    const res = await PUT(
      makeReq('http://localhost/api/mcp-templates', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'github-default',
          content: 'github:\n  command: uvx\n',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe('github:\n  command: uvx\n');
  });

  it('returns 404 when template missing', async () => {
    const res = await PUT(
      makeReq('http://localhost/api/mcp-templates', {
        method: 'PUT',
        body: JSON.stringify({ name: 'ghost', content: 'fs: {}' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/mcp-templates', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-mcp-tpl-api-'));
    fs.mkdirSync(path.join(tempDir, 'mcp-templates'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('deletes an existing template', async () => {
    fs.writeFileSync(path.join(tempDir, 'mcp-templates', 'github-default.yaml'), 'github: {}');
    const res = await DELETE(
      makeReq('http://localhost/api/mcp-templates?name=github-default', {
        method: 'DELETE',
      }),
    );
    expect(res.status).toBe(200);
    expect(fs.existsSync(path.join(tempDir, 'mcp-templates', 'github-default.yaml'))).toBe(false);
  });

  it('returns 400 when name missing', async () => {
    const res = await DELETE(makeReq('http://localhost/api/mcp-templates', { method: 'DELETE' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when name invalid', async () => {
    const res = await DELETE(
      makeReq('http://localhost/api/mcp-templates?name=../evil', { method: 'DELETE' }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when template missing', async () => {
    const res = await DELETE(
      makeReq('http://localhost/api/mcp-templates?name=ghost', { method: 'DELETE' }),
    );
    expect(res.status).toBe(404);
  });
});
