// @vitest-environment node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-api-test-'));
  vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);

  const agentHome = path.join(tmpDir, 'runtime', 'agents', 'alpha');
  await fsp.mkdir(agentHome, { recursive: true });
  await fsp.writeFile(path.join(agentHome, 'config.yaml'), 'name: default\n');
  await fsp.writeFile(path.join(agentHome, '.env'), '');
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

describe('GET /api/env', () => {
  it('returns 400 if agent param missing', async () => {
    const { GET } = await import('../../app/api/env/route');
    const res = await GET(makeReq('http://localhost/api/env'));
    expect(res.status).toBe(400);
  });

  it('returns 404 if agent not found', async () => {
    const { GET } = await import('../../app/api/env/route');
    const res = await GET(makeReq('http://localhost/api/env?agent=ghost'));
    expect(res.status).toBe(404);
  });

  it('masks only secure values and keeps plain values visible', async () => {
    const agentHome = path.join(tmpDir, 'runtime', 'agents', 'alpha');
    await fsp.writeFile(
      path.join(agentHome, '.env'),
      'API_KEY=secret\nBASE_URL=https://example.com\n',
    );
    await fsp.writeFile(
      path.join(agentHome, '.env.meta.json'),
      JSON.stringify({
        API_KEY: { visibility: 'secure' },
        BASE_URL: { visibility: 'plain' },
      }),
    );

    const { GET } = await import('../../app/api/env/route');
    const res = await GET(makeReq('http://localhost/api/env?agent=alpha'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual([
      { key: 'API_KEY', value: '***', masked: true, visibility: 'secure' },
      {
        key: 'BASE_URL',
        value: 'https://example.com',
        masked: false,
        visibility: 'plain',
      },
    ]);
  });

  it('treats variables without metadata as plain', async () => {
    const agentHome = path.join(tmpDir, 'runtime', 'agents', 'alpha');
    await fsp.writeFile(path.join(agentHome, '.env'), 'NEW_VAR=hello\n');

    const { GET } = await import('../../app/api/env/route');
    const res = await GET(makeReq('http://localhost/api/env?agent=alpha'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      { key: 'NEW_VAR', value: 'hello', masked: false, visibility: 'plain' },
    ]);
  });
});

describe('POST /api/env', () => {
  it('returns 400 for invalid JSON', async () => {
    const { POST } = await import('../../app/api/env/route');
    const req = makeReq('http://localhost/api/env', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing fields', async () => {
    const { POST } = await import('../../app/api/env/route');
    const req = makeReq('http://localhost/api/env', {
      method: 'POST',
      body: JSON.stringify({ agent: 'alpha' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown agent', async () => {
    const { POST } = await import('../../app/api/env/route');
    const req = makeReq('http://localhost/api/env', {
      method: 'POST',
      body: JSON.stringify({ agent: 'ghost', key: 'FOO', value: 'bar' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('upserts value and persists secure visibility metadata', async () => {
    const { POST, GET } = await import('../../app/api/env/route');
    const req = makeReq('http://localhost/api/env', {
      method: 'POST',
      body: JSON.stringify({
        agent: 'alpha',
        key: 'API_KEY',
        value: 'super-secret',
        visibility: 'secure',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, visibility: 'secure' });

    const envPath = path.join(tmpDir, 'runtime', 'agents', 'alpha', '.env');
    const content = await fsp.readFile(envPath, 'utf-8');
    expect(content).toContain('API_KEY=super-secret');

    // Verify .env.meta.json was created
    const metaPath = path.join(tmpDir, 'runtime', 'agents', 'alpha', '.env.meta.json');
    const meta = JSON.parse(await fsp.readFile(metaPath, 'utf-8'));
    expect(meta.API_KEY.visibility).toBe('secure');

    const readRes = await GET(makeReq('http://localhost/api/env?agent=alpha'));
    expect(await readRes.json()).toEqual([
      { key: 'API_KEY', value: '***', masked: true, visibility: 'secure' },
    ]);
  });

  it('defaults visibility to plain when omitted', async () => {
    const { POST, GET } = await import('../../app/api/env/route');
    const req = makeReq('http://localhost/api/env', {
      method: 'POST',
      body: JSON.stringify({ agent: 'alpha', key: 'BASE_URL', value: 'https://example.com' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, visibility: 'plain' });

    const readRes = await GET(makeReq('http://localhost/api/env?agent=alpha'));
    expect(await readRes.json()).toEqual([
      {
        key: 'BASE_URL',
        value: 'https://example.com',
        masked: false,
        visibility: 'plain',
      },
    ]);
  });

  it('keeps existing value when only visibility is updated without value', async () => {
    const agentHome = path.join(tmpDir, 'runtime', 'agents', 'alpha');
    await fsp.writeFile(path.join(agentHome, '.env'), 'API_KEY=super-secret\n');
    await fsp.writeFile(
      path.join(agentHome, '.env.meta.json'),
      JSON.stringify({ API_KEY: { visibility: 'secure' } }),
    );

    const { POST, GET } = await import('../../app/api/env/route');
    const req = makeReq('http://localhost/api/env', {
      method: 'POST',
      body: JSON.stringify({ agent: 'alpha', key: 'API_KEY', visibility: 'plain' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, visibility: 'plain' });

    const updatedEnv = await fsp.readFile(path.join(agentHome, '.env'), 'utf-8');
    expect(updatedEnv).toContain('API_KEY=super-secret');

    const readRes = await GET(makeReq('http://localhost/api/env?agent=alpha'));
    expect(await readRes.json()).toEqual([
      {
        key: 'API_KEY',
        value: 'super-secret',
        masked: false,
        visibility: 'plain',
      },
    ]);
  });
});

describe('DELETE /api/env', () => {
  it('returns 400 if agent param missing', async () => {
    const { DELETE } = await import('../../app/api/env/route');
    const res = await DELETE(makeReq('http://localhost/api/env?key=FOO', { method: 'DELETE' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 if key param missing', async () => {
    const { DELETE } = await import('../../app/api/env/route');
    const res = await DELETE(makeReq('http://localhost/api/env?agent=alpha', { method: 'DELETE' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown agent', async () => {
    const { DELETE } = await import('../../app/api/env/route');
    const res = await DELETE(
      makeReq('http://localhost/api/env?agent=ghost&key=FOO', { method: 'DELETE' }),
    );
    expect(res.status).toBe(404);
  });

  it('removes key from agent env and metadata', async () => {
    const agentHome = path.join(tmpDir, 'runtime', 'agents', 'alpha');
    await fsp.writeFile(path.join(agentHome, '.env'), 'REMOVE_ME=yes\nKEEP=ok\n');
    await fsp.writeFile(
      path.join(agentHome, '.env.meta.json'),
      JSON.stringify({ REMOVE_ME: { visibility: 'secure' } }),
    );

    const { DELETE, GET } = await import('../../app/api/env/route');
    const res = await DELETE(
      makeReq('http://localhost/api/env?agent=alpha&key=REMOVE_ME', { method: 'DELETE' }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const content = await fsp.readFile(path.join(agentHome, '.env'), 'utf-8');
    expect(content).not.toContain('REMOVE_ME');
    expect(content).toContain('KEEP=ok');

    const readRes = await GET(makeReq('http://localhost/api/env?agent=alpha'));
    expect(await readRes.json()).toEqual([
      { key: 'KEEP', value: 'ok', masked: false, visibility: 'plain' },
    ]);
  });
});

describe('GET /api/env/resolved', () => {
  it('returns 400 if agent param missing', async () => {
    const { GET } = await import('../../app/api/env/resolved/route');
    const res = await GET(makeReq('http://localhost/api/env/resolved'));
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown agent', async () => {
    const { GET } = await import('../../app/api/env/resolved/route');
    const res = await GET(makeReq('http://localhost/api/env/resolved?agent=ghost'));
    expect(res.status).toBe(404);
  });

  it('returns merged runtime values with source and visibility', async () => {
    const globalsDir = path.join(tmpDir, 'runtime', 'globals');
    await fsp.mkdir(globalsDir, { recursive: true });
    await fsp.writeFile(path.join(globalsDir, '.env'), 'BASE_URL=https://example.com\n');
    await fsp.writeFile(
      path.join(globalsDir, '.env.meta.json'),
      JSON.stringify({ BASE_URL: { visibility: 'plain' } }),
    );

    const agentHome = path.join(tmpDir, 'runtime', 'agents', 'alpha');
    await fsp.writeFile(
      path.join(agentHome, '.env'),
      'API_KEY=secret\nBASE_URL=https://override.example.com\n',
    );
    await fsp.writeFile(
      path.join(agentHome, '.env.meta.json'),
      JSON.stringify({
        API_KEY: { visibility: 'secure' },
        BASE_URL: { visibility: 'plain' },
      }),
    );

    const { GET } = await import('../../app/api/env/resolved/route');
    const res = await GET(makeReq('http://localhost/api/env/resolved?agent=alpha'));
    expect(res.status).toBe(200);

    const body = (await res.json()) as Array<{
      key: string;
      value: string;
      source: string;
      visibility: string;
    }>;

    expect(body.find((entry) => entry.key === 'BASE_URL')).toEqual({
      key: 'BASE_URL',
      value: 'https://override.example.com',
      source: 'agent-override',
      visibility: 'plain',
    });

    expect(body.find((entry) => entry.key === 'API_KEY')).toEqual({
      key: 'API_KEY',
      value: 'secret',
      source: 'agent',
      visibility: 'secure',
    });
  });

  it('marks global-only keys as source=global with plain fallback visibility', async () => {
    const globalsDir = path.join(tmpDir, 'runtime', 'globals');
    await fsp.mkdir(globalsDir, { recursive: true });
    await fsp.writeFile(path.join(globalsDir, '.env'), 'GLOBAL_VAR=gval\n');
    await fsp.writeFile(path.join(tmpDir, 'runtime', 'agents', 'alpha', '.env'), '');

    const { GET } = await import('../../app/api/env/resolved/route');
    const res = await GET(makeReq('http://localhost/api/env/resolved?agent=alpha'));
    expect(await res.json()).toEqual([
      { key: 'GLOBAL_VAR', value: 'gval', source: 'global', visibility: 'plain' },
    ]);
  });
});
