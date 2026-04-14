import fs from 'node:fs';
import path from 'node:path';

// better-sqlite3 is a runtime dependency but static resolution can fail in some lint contexts.
// eslint-disable-next-line import/no-unresolved
import Database from 'better-sqlite3';

export interface ChatSession {
  id: string;
  source: string | null;
  title: string | null;
  model: string | null;
  message_count: number;
  tool_call_count: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number | null;
  started_at: string;
  ended_at: string | null;
}

export interface ChatMessage {
  session_id: string;
  role: string;
  content: string;
  tool_calls: string | null;
  tool_call_id: string | null;
  tool_name: string | null;
  timestamp: string;
}

function resolveStateDbPath(agentHome: string): string {
  const resolvedHome = path.resolve(agentHome);
  const dbPath = path.resolve(resolvedHome, 'state.db');
  if (
    !dbPath.startsWith(`${resolvedHome}${path.sep}`) &&
    dbPath !== path.join(resolvedHome, 'state.db')
  ) {
    throw new Error('Invalid state.db path');
  }
  return dbPath;
}

function withReadOnlyDb<T>(agentHome: string, fn: (db: Database.Database) => T): T | [] {
  const dbPath = resolveStateDbPath(agentHome);
  if (!fs.existsSync(dbPath)) {
    return [];
  }

  const db = new Database(dbPath, { readonly: true });
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

export function getSessionList(
  agentHome: string,
  options?: { source?: string; sort?: 'asc' | 'desc' },
): ChatSession[] {
  const result = withReadOnlyDb(agentHome, (db) => {
    const sort = options?.sort === 'asc' ? 'ASC' : 'DESC';
    const sourceClause = options?.source ? 'WHERE source = @source' : '';
    const stmt = db.prepare(
      `SELECT id, source, title, model, message_count, tool_call_count, input_tokens, output_tokens, estimated_cost_usd, started_at, ended_at
       FROM sessions
       ${sourceClause}
       ORDER BY started_at ${sort}`,
    );
    if (options?.source) {
      return stmt.all({ source: options.source }) as ChatSession[];
    }
    return stmt.all() as ChatSession[];
  });

  return Array.isArray(result) ? (result as ChatSession[]) : [];
}

export interface SessionSearchResult {
  sessionId: string;
  source: string | null;
  title: string | null;
  messageCount: number;
  startedAt: string;
  match: {
    messageId: number;
    role: string;
    timestamp: string;
    snippet: string;
  };
}

export function searchSessionMessages(
  agentHome: string,
  query: string,
  options?: { source?: string; limit?: number },
): SessionSearchResult[] {
  const limit = Math.min(options?.limit ?? 50, 50);
  const result = withReadOnlyDb(agentHome, (db) => {
    const hasTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='messages_fts'")
      .get();
    if (!hasTable) return [];

    const sourceClause = options?.source ? 'AND s.source = @source' : '';
    const stmt = db.prepare(
      `SELECT
         s.id            AS sessionId,
         s.source        AS source,
         s.title         AS title,
         s.message_count AS messageCount,
         s.started_at    AS startedAt,
         m.rowid         AS messageId,
         m.role          AS role,
         m.timestamp     AS timestamp,
         snippet(messages_fts, 0, '<mark>', '</mark>', '...', 32) AS snippet
       FROM messages_fts
       JOIN messages m ON m.rowid = messages_fts.rowid
       JOIN sessions s ON m.session_id = s.id
       WHERE messages_fts MATCH @query
         ${sourceClause}
       ORDER BY m.timestamp DESC
       LIMIT @limit`,
    );
    const params: Record<string, string | number> = { query, limit };
    if (options?.source) params.source = options.source;
    return stmt.all(params) as Array<{
      sessionId: string;
      source: string | null;
      title: string | null;
      messageCount: number;
      startedAt: string;
      messageId: number;
      role: string;
      timestamp: string;
      snippet: string;
    }>;
  });

  if (!Array.isArray(result)) return [];

  return result.map((row) => ({
    sessionId: row.sessionId,
    source: row.source,
    title: row.title,
    messageCount: row.messageCount,
    startedAt: row.startedAt,
    match: {
      messageId: row.messageId,
      role: row.role,
      timestamp: row.timestamp,
      snippet: row.snippet,
    },
  }));
}

export function getMessages(agentHome: string, sessionId: string): ChatMessage[] {
  const result = withReadOnlyDb(agentHome, (db) => {
    const stmt = db.prepare(
      `SELECT session_id, role, content, tool_calls, tool_call_id, tool_name, timestamp
       FROM messages
       WHERE session_id = @sessionId
       ORDER BY timestamp ASC`,
    );
    return stmt.all({ sessionId }) as ChatMessage[];
  });

  return Array.isArray(result) ? (result as ChatMessage[]) : [];
}
