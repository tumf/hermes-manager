// @vitest-environment node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as schema from '../../db/schema';

let testDb: ReturnType<typeof drizzle<typeof schema>>;
let tmpDir: string;

vi.mock('../../src/lib/db', () => {
  return {
    get db() {
      return testDb;
    },
    schema,
  };
});

function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

beforeEach(async () => {
  const sqlite = new Database(':memory:');
  sqlite.exec(`
    CREATE TABLE agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      home TEXT NOT NULL,
      label TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
    );

    CREATE TABLE env_vars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'plain'
    );
  `);

  testDb = drizzle(sqlite, { schema });

  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-api-test-'));
  vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);

  const agentHome = path.join(tmpDir, 'runtime', 'agents', 'alpha');
  await fsp.mkdir(agentHome, { recursive: true });
  await testDb.insert(schema.agents).values({
    name: 'alpha',
    home: agentHome,
    label: 'ai.hermes.gateway.alpha',
    enabled: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

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
    const agentEnvPath = path.join(tmpDir, 'runtime', 'agents', 'alpha', '.env');
    await fsp.writeFile(agentEnvPath, 'API_KEY=secret\nBASE_URL=https://example.com\n', 'utf-8');
    await testDb.insert(schema.envVars).values([
      { scope: 'alpha', key: 'API_KEY', value: 'secret', visibility: 'secure' },
      { scope: 'alpha', key: 'BASE_URL', value: 'https://example.com', visibility: 'plain' },
    ]);

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
    const agentEnvPath = path.join(tmpDir, 'runtime', 'agents', 'alpha', '.env');
    await fsp.writeFile(agentEnvPath, 'NEW_VAR=hello\n', 'utf-8');

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

  it('keeps secure runtime value when only visibility is updated without value', async () => {
    const envPath = path.join(tmpDir, 'runtime', 'agents', 'alpha', '.env');
    await fsp.writeFile(envPath, 'API_KEY=super-secret\n', 'utf-8');
    await testDb.insert(schema.envVars).values({
      scope: 'alpha',
      key: 'API_KEY',
      value: 'super-secret',
      visibility: 'secure',
    });

    const { POST, GET } = await import('../../app/api/env/route');
    const req = makeReq('http://localhost/api/env', {
      method: 'POST',
      body: JSON.stringify({ agent: 'alpha', key: 'API_KEY', visibility: 'plain' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, visibility: 'plain' });

    const updatedEnv = await fsp.readFile(envPath, 'utf-8');
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
    const envPath = path.join(tmpDir, 'runtime', 'agents', 'alpha', '.env');
    await fsp.writeFile(envPath, 'REMOVE_ME=yes\nKEEP=ok\n', 'utf-8');
    await testDb.insert(schema.envVars).values({
      scope: 'alpha',
      key: 'REMOVE_ME',
      value: 'yes',
      visibility: 'secure',
    });

    const { DELETE, GET } = await import('../../app/api/env/route');
    const res = await DELETE(
      makeReq('http://localhost/api/env?agent=alpha&key=REMOVE_ME', { method: 'DELETE' }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const content = await fsp.readFile(envPath, 'utf-8');
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
    await fsp.writeFile(path.join(globalsDir, '.env'), 'BASE_URL=https://example.com\n', 'utf-8');
    await fsp.writeFile(
      path.join(tmpDir, 'runtime', 'agents', 'alpha', '.env'),
      'API_KEY=secret\nBASE_URL=https://override.example.com\n',
      'utf-8',
    );

    await testDb.insert(schema.envVars).values([
      { scope: 'global', key: 'BASE_URL', value: 'https://example.com', visibility: 'plain' },
      { scope: 'alpha', key: 'API_KEY', value: 'secret', visibility: 'secure' },
      {
        scope: 'alpha',
        key: 'BASE_URL',
        value: 'https://override.example.com',
        visibility: 'plain',
      },
    ]);

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
    await fsp.writeFile(path.join(globalsDir, '.env'), 'GLOBAL_VAR=gval\n', 'utf-8');
    await fsp.writeFile(path.join(tmpDir, 'runtime', 'agents', 'alpha', '.env'), '', 'utf-8');

    const { GET } = await import('../../app/api/env/resolved/route');
    const res = await GET(makeReq('http://localhost/api/env/resolved?agent=alpha'));
    expect(await res.json()).toEqual([
      { key: 'GLOBAL_VAR', value: 'gval', source: 'global', visibility: 'plain' },
    ]);
  });
});
