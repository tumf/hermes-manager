import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

export interface ChatSession {
  id: string;
  source: string | null;
  title: string | null;
  model: string | null;
  message_count: number;
  tool_call_count: number;
  tokens: number;
  cost: number;
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
      `SELECT id, source, title, model, message_count, tool_call_count, tokens, cost, started_at, ended_at
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
