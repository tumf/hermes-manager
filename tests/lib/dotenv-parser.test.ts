import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { clearTokenValues, deleteKey, parse, serialize, upsert } from '@/src/lib/dotenv-parser';

describe('parse', () => {
  it('parses basic KEY=VALUE lines', () => {
    expect(parse('FOO=bar\nBAZ=qux\n')).toEqual([
      { key: 'FOO', value: 'bar' },
      { key: 'BAZ', value: 'qux' },
    ]);
  });

  it('skips comment lines', () => {
    expect(parse('# comment\nFOO=bar\n')).toEqual([{ key: 'FOO', value: 'bar' }]);
  });

  it('skips empty lines', () => {
    expect(parse('\nFOO=bar\n\n')).toEqual([{ key: 'FOO', value: 'bar' }]);
  });

  it('handles empty content', () => {
    expect(parse('')).toEqual([]);
  });

  it('handles value containing equals sign', () => {
    expect(parse('URL=http://a=b\n')).toEqual([{ key: 'URL', value: 'http://a=b' }]);
  });
});

describe('serialize', () => {
  it('serializes entries to KEY=VALUE lines with trailing newline', () => {
    expect(
      serialize([
        { key: 'FOO', value: 'bar' },
        { key: 'BAZ', value: 'qux' },
      ]),
    ).toBe('FOO=bar\nBAZ=qux\n');
  });

  it('returns empty string for empty entries', () => {
    expect(serialize([])).toBe('');
  });
});

describe('upsert', () => {
  it('adds a new key when absent', () => {
    expect(upsert([{ key: 'FOO', value: 'bar' }], 'NEW', 'val')).toEqual([
      { key: 'FOO', value: 'bar' },
      { key: 'NEW', value: 'val' },
    ]);
  });

  it('updates an existing key', () => {
    expect(upsert([{ key: 'FOO', value: 'bar' }], 'FOO', 'updated')).toEqual([
      { key: 'FOO', value: 'updated' },
    ]);
  });

  it('upserts into empty list', () => {
    expect(upsert([], 'KEY', 'val')).toEqual([{ key: 'KEY', value: 'val' }]);
  });
});

describe('deleteKey', () => {
  it('removes a key that exists', () => {
    expect(
      deleteKey(
        [
          { key: 'FOO', value: 'bar' },
          { key: 'BAZ', value: 'qux' },
        ],
        'FOO',
      ),
    ).toEqual([{ key: 'BAZ', value: 'qux' }]);
  });

  it('is a no-op for missing key', () => {
    const entries = [{ key: 'FOO', value: 'bar' }];
    expect(deleteKey(entries, 'MISSING')).toEqual(entries);
  });

  it('handles empty list', () => {
    expect(deleteKey([], 'KEY')).toEqual([]);
  });
});

describe('clearTokenValues', () => {
  const tmpPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tmpPaths.splice(0).map((tmpPath) => fs.rm(tmpPath, { recursive: true, force: true })),
    );
  });

  async function createEnvFile(content: string): Promise<string> {
    const tmpPath = await fs.mkdtemp(path.join(os.tmpdir(), 'dotenv-parser-test-'));
    tmpPaths.push(tmpPath);
    const envPath = path.join(tmpPath, '.env');
    await fs.writeFile(envPath, content, 'utf-8');
    return envPath;
  }

  it('clears only specified token keys when present', async () => {
    const envPath = await createEnvFile('TELEGRAM_BOT_TOKEN=abc123\nOPENAI_API_KEY=sk-xxx\n');

    await clearTokenValues(envPath, ['TELEGRAM_BOT_TOKEN', 'DISCORD_BOT_TOKEN']);

    await expect(fs.readFile(envPath, 'utf-8')).resolves.toBe(
      'TELEGRAM_BOT_TOKEN=\nOPENAI_API_KEY=sk-xxx\n',
    );
  });

  it('keeps file unchanged when keys are absent', async () => {
    const envPath = await createEnvFile('OPENAI_API_KEY=sk-xxx\n');

    await clearTokenValues(envPath, ['TELEGRAM_BOT_TOKEN']);

    await expect(fs.readFile(envPath, 'utf-8')).resolves.toBe('OPENAI_API_KEY=sk-xxx\n');
  });

  it('clears matching keys and keeps non-matching mixed keys intact', async () => {
    const envPath = await createEnvFile(
      'SLACK_BOT_TOKEN=bot-token\nBASE_URL=https://example.com\n',
    );

    await clearTokenValues(envPath, ['SLACK_BOT_TOKEN', 'TELEGRAM_BOT_TOKEN']);

    await expect(fs.readFile(envPath, 'utf-8')).resolves.toBe(
      'SLACK_BOT_TOKEN=\nBASE_URL="https://example.com"\n',
    );
  });

  it('handles empty env file', async () => {
    const envPath = await createEnvFile('');

    await clearTokenValues(envPath, ['SLACK_BOT_TOKEN']);

    await expect(fs.readFile(envPath, 'utf-8')).resolves.toBe('');
  });
});
