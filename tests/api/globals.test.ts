import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'globals-test-'));
  vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  // Ensure globals dir exists
  await fsp.mkdir(path.join(tmpDir, 'runtime', 'globals'), { recursive: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeRequest(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('GET /api/globals', () => {
  it('returns empty array when no globals exist', async () => {
    const { GET } = await import('../../app/api/globals/route');
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual([]);
  });

  it('returns global variables from .env file', async () => {
    const globalsDir = path.join(tmpDir, 'runtime', 'globals');
    await fsp.writeFile(path.join(globalsDir, '.env'), 'FOO=bar\n');
    await fsp.writeFile(
      path.join(globalsDir, '.env.meta.json'),
      JSON.stringify({ FOO: { visibility: 'plain' } }),
    );

    const { GET } = await import('../../app/api/globals/route');
    const res = await GET();
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].key).toBe('FOO');
    expect(json[0].scope).toBe('global');
    expect(json[0].visibility).toBe('plain');
    expect(json[0].masked).toBe(false);
    expect(json[0].value).toBe('bar');
  });

  it('masks secure globals in management response', async () => {
    const globalsDir = path.join(tmpDir, 'runtime', 'globals');
    await fsp.writeFile(path.join(globalsDir, '.env'), 'SECRET=token\n');
    await fsp.writeFile(
      path.join(globalsDir, '.env.meta.json'),
      JSON.stringify({ SECRET: { visibility: 'secure' } }),
    );

    const { GET } = await import('../../app/api/globals/route');
    const res = await GET();
    const json = await res.json();

    expect(json).toHaveLength(1);
    expect(json[0]).toMatchObject({
      key: 'SECRET',
      visibility: 'secure',
      value: '***',
      masked: true,
    });
  });
});

describe('POST /api/globals', () => {
  it('inserts a new global variable and writes globals/.env', async () => {
    const { POST } = await import('../../app/api/globals/route');
    const req = makeRequest('POST', 'http://localhost/api/globals', {
      key: 'FOO',
      value: 'bar',
      visibility: 'plain',
    });
    const res = await POST(req as never);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.key).toBe('FOO');
    expect(json.value).toBe('bar');
    expect(json.scope).toBe('global');
    expect(json.visibility).toBe('plain');
    expect(json.masked).toBe(false);

    const envFile = path.join(tmpDir, 'runtime', 'globals', '.env');
    expect(fs.existsSync(envFile)).toBe(true);
    expect(fs.readFileSync(envFile, 'utf-8')).toContain('FOO=bar');
  });

  it('stores secure global visibility while masking response', async () => {
    const { POST } = await import('../../app/api/globals/route');
    const req = makeRequest('POST', 'http://localhost/api/globals', {
      key: 'API_KEY',
      value: 'super-secret',
      visibility: 'secure',
    });

    const res = await POST(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      key: 'API_KEY',
      visibility: 'secure',
      masked: true,
      value: '***',
    });

    // Verify actual value is in .env
    const envFile = path.join(tmpDir, 'runtime', 'globals', '.env');
    expect(fs.readFileSync(envFile, 'utf-8')).toContain('API_KEY=super-secret');

    // Verify visibility metadata in .env.meta.json
    const metaFile = path.join(tmpDir, 'runtime', 'globals', '.env.meta.json');
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
    expect(meta.API_KEY.visibility).toBe('secure');
  });

  it('updates an existing global variable', async () => {
    const globalsDir = path.join(tmpDir, 'runtime', 'globals');
    await fsp.writeFile(path.join(globalsDir, '.env'), 'FOO=old\n');
    await fsp.writeFile(
      path.join(globalsDir, '.env.meta.json'),
      JSON.stringify({ FOO: { visibility: 'plain' } }),
    );

    const { POST } = await import('../../app/api/globals/route');
    const req = makeRequest('POST', 'http://localhost/api/globals', {
      key: 'FOO',
      value: 'new',
      visibility: 'secure',
    });
    const res = await POST(req as never);
    const json = await res.json();
    expect(json.value).toBe('***');
    expect(json.visibility).toBe('secure');

    const envFile = path.join(tmpDir, 'runtime', 'globals', '.env');
    const content = fs.readFileSync(envFile, 'utf-8');
    expect(content).toContain('FOO=new');
    expect(content).not.toContain('FOO=old');
  });

  it('returns 400 for missing key', async () => {
    const { POST } = await import('../../app/api/globals/route');
    const req = makeRequest('POST', 'http://localhost/api/globals', { value: 'bar' });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/globals', () => {
  it('removes a global variable and updates globals/.env', async () => {
    const globalsDir = path.join(tmpDir, 'runtime', 'globals');
    await fsp.writeFile(path.join(globalsDir, '.env'), 'BAZ=qux\n');
    await fsp.writeFile(
      path.join(globalsDir, '.env.meta.json'),
      JSON.stringify({ BAZ: { visibility: 'plain' } }),
    );

    const { DELETE } = await import('../../app/api/globals/route');
    const req = makeRequest('DELETE', 'http://localhost/api/globals?key=BAZ');
    const res = await DELETE(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe('BAZ');

    const envFile = path.join(tmpDir, 'runtime', 'globals', '.env');
    const content = fs.readFileSync(envFile, 'utf-8');
    expect(content).not.toContain('BAZ=qux');
  });

  it('returns 400 when key param is missing', async () => {
    const { DELETE } = await import('../../app/api/globals/route');
    const req = makeRequest('DELETE', 'http://localhost/api/globals');
    const res = await DELETE(req as never);
    expect(res.status).toBe(400);
  });
});
