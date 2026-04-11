import { describe, expect, it } from 'vitest';

import { parseSseChunk } from '../../src/lib/parse-sse-chunk';

describe('parseSseChunk', () => {
  it('parses a single complete event', () => {
    const { events, rest } = parseSseChunk('data: hello\n\n');
    expect(events).toEqual(['hello']);
    expect(rest).toBe('');
  });

  it('parses multiple events from one buffer', () => {
    const { events, rest } = parseSseChunk('data: a\n\ndata: b\n\n');
    expect(events).toEqual(['a', 'b']);
    expect(rest).toBe('');
  });

  it('returns incomplete data as rest', () => {
    const { events, rest } = parseSseChunk('data: a\n\ndata: partial');
    expect(events).toEqual(['a']);
    expect(rest).toBe('data: partial');
  });

  it('ignores non-data lines', () => {
    const { events, rest } = parseSseChunk('event: message\ndata: payload\n\n');
    expect(events).toEqual(['payload']);
    expect(rest).toBe('');
  });

  it('handles empty buffer', () => {
    const { events, rest } = parseSseChunk('');
    expect(events).toEqual([]);
    expect(rest).toBe('');
  });

  it('trims whitespace from data values', () => {
    const { events } = parseSseChunk('data:  spaced  \n\n');
    expect(events).toEqual(['spaced']);
  });

  it('parses JSON data payloads', () => {
    const { events } = parseSseChunk('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n');
    expect(events).toHaveLength(1);
    const parsed = JSON.parse(events[0]);
    expect(parsed.choices[0].delta.content).toBe('Hello');
  });
});
