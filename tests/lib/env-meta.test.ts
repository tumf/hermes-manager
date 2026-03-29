import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildVisibilityMap,
  getVisibility,
  readEnvMeta,
  removeVisibility,
  setVisibility,
  writeEnvMeta,
} from '../../src/lib/env-meta';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-meta-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('readEnvMeta', () => {
  it('returns empty object when file does not exist', async () => {
    const meta = await readEnvMeta(tmpDir);
    expect(meta).toEqual({});
  });

  it('reads valid .env.meta.json', async () => {
    await fsp.writeFile(
      path.join(tmpDir, '.env.meta.json'),
      JSON.stringify({ API_KEY: { visibility: 'secure' } }),
    );
    const meta = await readEnvMeta(tmpDir);
    expect(meta).toEqual({ API_KEY: { visibility: 'secure' } });
  });

  it('returns empty object for invalid JSON', async () => {
    await fsp.writeFile(path.join(tmpDir, '.env.meta.json'), 'not-json');
    const meta = await readEnvMeta(tmpDir);
    expect(meta).toEqual({});
  });
});

describe('writeEnvMeta', () => {
  it('writes .env.meta.json atomically', async () => {
    await writeEnvMeta(tmpDir, { FOO: { visibility: 'plain' } });
    const content = await fsp.readFile(path.join(tmpDir, '.env.meta.json'), 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed).toEqual({ FOO: { visibility: 'plain' } });
  });
});

describe('getVisibility', () => {
  it('returns secure for secure keys', () => {
    expect(getVisibility({ KEY: { visibility: 'secure' } }, 'KEY')).toBe('secure');
  });

  it('returns plain for missing keys', () => {
    expect(getVisibility({}, 'MISSING')).toBe('plain');
  });
});

describe('setVisibility', () => {
  it('sets and persists visibility', async () => {
    await setVisibility(tmpDir, 'SECRET', 'secure');
    const meta = await readEnvMeta(tmpDir);
    expect(meta.SECRET.visibility).toBe('secure');
  });
});

describe('removeVisibility', () => {
  it('removes visibility metadata for a key', async () => {
    await writeEnvMeta(tmpDir, {
      KEEP: { visibility: 'plain' },
      REMOVE: { visibility: 'secure' },
    });
    await removeVisibility(tmpDir, 'REMOVE');
    const meta = await readEnvMeta(tmpDir);
    expect(meta).toEqual({ KEEP: { visibility: 'plain' } });
  });
});

describe('buildVisibilityMap', () => {
  it('builds a Map from env meta', () => {
    const map = buildVisibilityMap({
      A: { visibility: 'secure' },
      B: { visibility: 'plain' },
    });
    expect(map.get('A')).toBe('secure');
    expect(map.get('B')).toBe('plain');
  });
});
