// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- temp directory for fs-based templates ---
let tempDir: string;

vi.mock('../../src/lib/runtime-paths', () => ({
  getRuntimeTemplatesRootPath: (...segments: string[]) => {
    return path.join(tempDir, 'templates', ...segments);
  },
}));

import { DELETE, GET, POST, PUT } from '../../app/api/templates/route';

function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

describe('GET /api/templates', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-tpl-api-'));
    fs.mkdirSync(path.join(tempDir, 'templates'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns empty array when no templates', async () => {
    const req = makeReq('http://localhost/api/templates');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('lists all templates with files', async () => {
    const defaultDir = path.join(tempDir, 'templates', 'default');
    fs.mkdirSync(defaultDir, { recursive: true });
    fs.writeFileSync(path.join(defaultDir, 'MEMORY.md'), '# Default\n');
    fs.writeFileSync(path.join(defaultDir, 'USER.md'), '# User\n');
    fs.writeFileSync(path.join(defaultDir, 'config.yaml'), 'name: default\n');

    const req = makeReq('http://localhost/api/templates');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([{ name: 'default', files: ['MEMORY.md', 'USER.md', 'config.yaml'] }]);
  });

  it('returns specific template file content', async () => {
    const defaultDir = path.join(tempDir, 'templates', 'default');
    fs.mkdirSync(defaultDir, { recursive: true });
    fs.writeFileSync(path.join(defaultDir, 'MEMORY.md'), '# Agent Instructions\n');

    const req = makeReq('http://localhost/api/templates?name=default&file=MEMORY.md');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      name: 'default',
      file: 'MEMORY.md',
      content: '# Agent Instructions\n',
    });
  });

  it('returns 404 for non-existent template file', async () => {
    const req = makeReq('http://localhost/api/templates?name=ghost&file=MEMORY.md');
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid file name', async () => {
    const req = makeReq('http://localhost/api/templates?name=default&file=invalid.txt');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid template name', async () => {
    const req = makeReq('http://localhost/api/templates?name=../evil&file=MEMORY.md');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/templates', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-tpl-api-'));
    fs.mkdirSync(path.join(tempDir, 'templates'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates template file and returns 201', async () => {
    const req = makeReq('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        file: 'config.yaml',
        name: 'telegram-bot',
        content: 'name: bot\n',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({
      name: 'telegram-bot',
      file: 'config.yaml',
      content: 'name: bot\n',
    });

    // Verify file exists on disk
    const filePath = path.join(tempDir, 'templates', 'telegram-bot', 'config.yaml');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('returns 409 when file already exists', async () => {
    const dir = path.join(tempDir, 'templates', 'default');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'MEMORY.md'), '# Default\n');

    const req = makeReq('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        file: 'MEMORY.md',
        name: 'default',
        content: '# New content',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it('returns 400 for invalid file', async () => {
    const req = makeReq('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        file: 'invalid.txt',
        name: 'test',
        content: 'test',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid name', async () => {
    const req = makeReq('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        file: 'MEMORY.md',
        name: 'bad name!',
        content: 'test',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = makeReq('http://localhost/api/templates', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'text/plain' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/templates', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-tpl-api-'));
    fs.mkdirSync(path.join(tempDir, 'templates'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('updates existing template file', async () => {
    const dir = path.join(tempDir, 'templates', 'default');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'MEMORY.md'), '# Old\n');

    const req = makeReq('http://localhost/api/templates', {
      method: 'PUT',
      body: JSON.stringify({
        file: 'MEMORY.md',
        name: 'default',
        content: '# Updated\n',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe('# Updated\n');
  });

  it('returns 404 when template file not found', async () => {
    const req = makeReq('http://localhost/api/templates', {
      method: 'PUT',
      body: JSON.stringify({
        file: 'MEMORY.md',
        name: 'nonexistent',
        content: 'test',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/templates', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-tpl-api-'));
    fs.mkdirSync(path.join(tempDir, 'templates'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('deletes a single template file and returns ok', async () => {
    const dir = path.join(tempDir, 'templates', 'test-tpl');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SOUL.md'), '# Soul');

    const req = makeReq('http://localhost/api/templates?name=test-tpl&file=SOUL.md', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('deletes entire template directory', async () => {
    const dir = path.join(tempDir, 'templates', 'old-template');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'MEMORY.md'), '# Old');
    fs.writeFileSync(path.join(dir, 'config.yaml'), 'name: old');

    const req = makeReq('http://localhost/api/templates?name=old-template', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(fs.existsSync(dir)).toBe(false);
  });

  it('returns 400 when name is missing', async () => {
    const req = makeReq('http://localhost/api/templates', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid file name', async () => {
    const req = makeReq('http://localhost/api/templates?name=test&file=bad.txt', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when template file not found', async () => {
    const req = makeReq('http://localhost/api/templates?name=ghost&file=MEMORY.md', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });

  it('returns 404 when template directory not found', async () => {
    const req = makeReq('http://localhost/api/templates?name=ghost', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });
});
