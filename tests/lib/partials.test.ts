// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tempDir: string;

vi.mock('../../src/lib/runtime-paths', () => ({
  getRuntimeAgentsRootPath: (...segments: string[]) => path.join(tempDir, 'agents', ...segments),
  getRuntimePartialsRootPath: (...segments: string[]) =>
    path.join(tempDir, 'partials', ...segments),
}));

import {
  deletePartial,
  findAgentsUsingPartial,
  isValidPartialName,
  listPartialNames,
  parsePartialReferences,
  readPartial,
  writePartial,
} from '../../src/lib/partials';

function writeFixture(targetPath: string, content: string): void {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

describe('partials lib', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-partials-lib-'));
    fs.mkdirSync(path.join(tempDir, 'partials'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'agents'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('validates partial names', () => {
    expect(isValidPartialName('shared_rules')).toBe(true);
    expect(isValidPartialName('bad name')).toBe(false);
  });

  it('parses unique partial references', () => {
    const refs = parsePartialReferences('{{partial:one}}\n{{partial:two}}\n{{partial:one}}');
    expect(refs).toEqual(['one', 'two']);
  });

  it('lists partial names from runtime/partials', async () => {
    writeFixture(path.join(tempDir, 'partials', 'one.md'), '# one');
    writeFixture(path.join(tempDir, 'partials', 'two.md'), '# two');

    const names = await listPartialNames();
    expect(names).toEqual(['one', 'two']);
  });

  it('reads and writes partial files', async () => {
    await writePartial('shared', '# shared');
    expect(await readPartial('shared')).toBe('# shared');
  });

  it('deletes partial file', async () => {
    await writePartial('shared', '# shared');
    const deleted = await deletePartial('shared');

    expect(deleted).toBe(true);
    expect(await readPartial('shared')).toBeNull();
  });

  it('finds agents using a partial reference', async () => {
    writeFixture(path.join(tempDir, 'agents', 'alpha', 'SOUL.src.md'), '{{partial:shared}}');
    writeFixture(path.join(tempDir, 'agents', 'beta', 'SOUL.src.md'), '{{partial:other}}');

    const users = await findAgentsUsingPartial('shared');
    expect(users).toEqual(['alpha']);
  });
});
