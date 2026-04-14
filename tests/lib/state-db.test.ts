// @vitest-environment node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = vi.hoisted(() => ({
  sessionRows: [] as unknown[],
  messageRows: [] as unknown[],
  searchRows: [] as unknown[],
  hasFtsTable: true,
  closed: false,
}));

vi.mock('better-sqlite3', () => ({
  default: vi.fn(() => ({
    prepare: (sql: string) => ({
      get: () => {
        if (sql.includes("name='messages_fts'")) {
          return mockDb.hasFtsTable ? { name: 'messages_fts' } : undefined;
        }
        return undefined;
      },
      all: (params?: Record<string, unknown>) => {
        if (sql.includes('FROM messages_fts')) {
          let rows = mockDb.searchRows;
          if (params?.source) {
            rows = rows.filter((row) => (row as { source?: string }).source === params.source);
          }
          const limit = (params?.limit as number) ?? 50;
          return rows.slice(0, limit);
        }
        if (sql.includes('FROM sessions')) {
          if (params?.source) {
            return mockDb.sessionRows.filter(
              (row) => (row as { source?: string }).source === params.source,
            );
          }
          return mockDb.sessionRows;
        }
        if (sql.includes('FROM messages')) {
          return mockDb.messageRows.filter(
            (row) => (row as { session_id?: string }).session_id === params?.sessionId,
          );
        }
        return [];
      },
    }),
    close: () => {
      mockDb.closed = true;
    },
  })),
}));

import { getMessages, getSessionList, searchSessionMessages } from '../../src/lib/state-db';

let tmpDir: string;
let agentHome: string;

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'state-db-test-'));
  agentHome = path.join(tmpDir, 'runtime', 'agents', 'alpha');
  await fsp.mkdir(agentHome, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function seedDb() {
  await fsp.writeFile(path.join(agentHome, 'state.db'), 'dummy');
  mockDb.sessionRows = [
    {
      id: 's2',
      source: 'telegram',
      title: 'Session 2',
      model: 'gpt',
      message_count: 1,
      tool_call_count: 0,
      tokens: 5,
      cost: 0.05,
      started_at: '2026-01-02T00:00:00Z',
      ended_at: null,
    },
    {
      id: 's1',
      source: 'tool',
      title: 'Session 1',
      model: 'gpt',
      message_count: 2,
      tool_call_count: 0,
      tokens: 10,
      cost: 0.1,
      started_at: '2026-01-01T00:00:00Z',
      ended_at: null,
    },
  ];
  mockDb.messageRows = [
    {
      session_id: 's1',
      role: 'user',
      content: 'hello',
      tool_calls: null,
      tool_call_id: null,
      tool_name: null,
      timestamp: '2026-01-01T00:00:01Z',
    },
    {
      session_id: 's1',
      role: 'assistant',
      content: 'hi',
      tool_calls: null,
      tool_call_id: null,
      tool_name: null,
      timestamp: '2026-01-01T00:00:02Z',
    },
  ];
}

describe('state-db helpers', () => {
  it('returns empty arrays when state.db does not exist', () => {
    expect(getSessionList(agentHome)).toEqual([]);
    expect(getMessages(agentHome, 's1')).toEqual([]);
  });

  it('returns sessions sorted by started_at desc by default and filterable', async () => {
    await seedDb();
    const sessions = getSessionList(agentHome);
    expect(sessions.map((s) => s.id)).toEqual(['s2', 's1']);

    const filtered = getSessionList(agentHome, { source: 'tool', sort: 'asc' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('s1');
  });

  it('returns messages in ascending timestamp order', async () => {
    await seedDb();
    const messages = getMessages(agentHome, 's1');
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe('hello');
    expect(messages[1].content).toBe('hi');
  });
});

describe('searchSessionMessages', () => {
  beforeEach(() => {
    mockDb.hasFtsTable = true;
    mockDb.searchRows = [];
  });

  it('returns empty array when state.db does not exist', () => {
    expect(searchSessionMessages(agentHome, 'test')).toEqual([]);
  });

  it('returns empty array when messages_fts table does not exist', async () => {
    await seedDb();
    mockDb.hasFtsTable = false;
    expect(searchSessionMessages(agentHome, 'gateway')).toEqual([]);
  });

  it('returns matching results with snippet', async () => {
    await seedDb();
    mockDb.searchRows = [
      {
        sessionId: 's1',
        source: 'tool',
        title: 'Session 1',
        messageCount: 2,
        startedAt: '2026-01-01T00:00:00Z',
        messageId: 1,
        role: 'user',
        timestamp: '2026-01-01T00:00:01Z',
        snippet: '...error in <mark>gateway</mark> startup...',
      },
    ];
    const results = searchSessionMessages(agentHome, 'gateway');
    expect(results).toHaveLength(1);
    expect(results[0].sessionId).toBe('s1');
    expect(results[0].match.snippet).toContain('<mark>gateway</mark>');
    expect(results[0].match.role).toBe('user');
  });

  it('filters by source when provided', async () => {
    await seedDb();
    mockDb.searchRows = [
      {
        sessionId: 's1',
        source: 'tool',
        title: 'Session 1',
        messageCount: 2,
        startedAt: '2026-01-01T00:00:00Z',
        messageId: 1,
        role: 'user',
        timestamp: '2026-01-01T00:00:01Z',
        snippet: 'match',
      },
      {
        sessionId: 's2',
        source: 'telegram',
        title: 'Session 2',
        messageCount: 1,
        startedAt: '2026-01-02T00:00:00Z',
        messageId: 2,
        role: 'assistant',
        timestamp: '2026-01-02T00:00:01Z',
        snippet: 'match',
      },
    ];
    const results = searchSessionMessages(agentHome, 'match', { source: 'telegram' });
    expect(results).toHaveLength(1);
    expect(results[0].source).toBe('telegram');
  });

  it('respects limit option', async () => {
    await seedDb();
    mockDb.searchRows = Array.from({ length: 10 }, (_, i) => ({
      sessionId: `s${i}`,
      source: 'tool',
      title: `Session ${i}`,
      messageCount: 1,
      startedAt: '2026-01-01T00:00:00Z',
      messageId: i,
      role: 'user',
      timestamp: '2026-01-01T00:00:01Z',
      snippet: 'match',
    }));
    const results = searchSessionMessages(agentHome, 'match', { limit: 3 });
    expect(results).toHaveLength(3);
  });

  it('caps limit at 50', async () => {
    await seedDb();
    mockDb.searchRows = Array.from({ length: 60 }, (_, i) => ({
      sessionId: `s${i}`,
      source: 'tool',
      title: `Session ${i}`,
      messageCount: 1,
      startedAt: '2026-01-01T00:00:00Z',
      messageId: i,
      role: 'user',
      timestamp: '2026-01-01T00:00:01Z',
      snippet: 'match',
    }));
    const results = searchSessionMessages(agentHome, 'match', { limit: 100 });
    expect(results).toHaveLength(50);
  });
});
