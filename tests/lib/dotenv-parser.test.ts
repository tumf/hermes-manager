import { describe, expect, it } from 'vitest';

import { deleteKey, parse, serialize, upsert } from '@/src/lib/dotenv-parser';

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
    expect(serialize([{ key: 'FOO', value: 'bar' }, { key: 'BAZ', value: 'qux' }])).toBe(
      'FOO=bar\nBAZ=qux\n',
    );
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
      deleteKey([{ key: 'FOO', value: 'bar' }, { key: 'BAZ', value: 'qux' }], 'FOO'),
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
