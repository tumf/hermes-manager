import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import * as schema from '../../db/schema';

// ---- setup in-memory DB and override src/lib/db ----

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

beforeEach(() => {
  const sqlite = new Database(':memory:');
  sqlite.exec(`
    CREATE TABLE env_vars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'plain'
    )
  `);
  testDb = drizzle(sqlite, { schema });

  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'globals-test-'));
  vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
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

  it('returns only global-scope rows', async () => {
    await testDb.insert(schema.envVars).values([
      { scope: 'global', key: 'FOO', value: 'bar', visibility: 'plain' },
      { scope: 'agent-x', key: 'AGENT_VAR', value: 'x', visibility: 'plain' },
    ]);
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
    await testDb
      .insert(schema.envVars)
      .values({ scope: 'global', key: 'SECRET', value: 'token', visibility: 'secure' });

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
  it('inserts a new global variable and regenerates globals/.env', async () => {
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

    const [stored] = await testDb
      .select()
      .from(schema.envVars)
      .where(and(eq(schema.envVars.scope, 'global'), eq(schema.envVars.key, 'API_KEY')));

    expect(stored?.value).toBe('super-secret');
    expect(stored?.visibility).toBe('secure');

    const envFile = path.join(tmpDir, 'runtime', 'globals', '.env');
    expect(fs.readFileSync(envFile, 'utf-8')).toContain('API_KEY=super-secret');
  });

  it('updates an existing global variable', async () => {
    await testDb
      .insert(schema.envVars)
      .values({ scope: 'global', key: 'FOO', value: 'old', visibility: 'plain' });
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

    const [stored] = await testDb
      .select()
      .from(schema.envVars)
      .where(and(eq(schema.envVars.scope, 'global'), eq(schema.envVars.key, 'FOO')));
    expect(stored?.visibility).toBe('secure');
  });

  it('returns 400 for missing key', async () => {
    const { POST } = await import('../../app/api/globals/route');
    const req = makeRequest('POST', 'http://localhost/api/globals', { value: 'bar' });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/globals', () => {
  it('removes a global variable and regenerates globals/.env', async () => {
    await testDb
      .insert(schema.envVars)
      .values({ scope: 'global', key: 'BAZ', value: 'qux', visibility: 'plain' });
    const { DELETE } = await import('../../app/api/globals/route');
    const req = makeRequest('DELETE', 'http://localhost/api/globals?key=BAZ');
    const res = await DELETE(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe('BAZ');

    const remaining = await testDb
      .select()
      .from(schema.envVars)
      .where(and(eq(schema.envVars.scope, 'global'), eq(schema.envVars.key, 'BAZ')));
    expect(remaining).toHaveLength(0);

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

describe('globals/.env format', () => {
  it('writes one KEY=VALUE per line with no extra blank lines', async () => {
    await testDb.insert(schema.envVars).values([
      { scope: 'global', key: 'A', value: '1', visibility: 'plain' },
      { scope: 'global', key: 'B', value: '2', visibility: 'secure' },
    ]);
    const { regenerateGlobalsEnv } = await import('../../src/lib/globals-env');
    await regenerateGlobalsEnv();

    const envFile = path.join(tmpDir, 'runtime', 'globals', '.env');
    const content = fs.readFileSync(envFile, 'utf-8');
    expect(content).toBe('A=1\nB=2\n');
  });
});
