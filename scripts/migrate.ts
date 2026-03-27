import Database from 'better-sqlite3';

import { ensureRuntimeDirectories, getRuntimeDataRootPath } from '../src/lib/runtime-paths';

ensureRuntimeDirectories();
const DB_PATH = getRuntimeDataRootPath('app.db');

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    home TEXT NOT NULL,
    label TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
  );

  CREATE TABLE IF NOT EXISTS env_vars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scope TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'plain'
  );

  CREATE TABLE IF NOT EXISTS skill_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent TEXT NOT NULL,
    source_path TEXT NOT NULL,
    target_path TEXT NOT NULL
  );
`);

const envVarsColumns = db.prepare("PRAGMA table_info('env_vars')").all() as Array<{ name: string }>;
const hasVisibilityColumn = envVarsColumns.some((column) => column.name === 'visibility');

if (!hasVisibilityColumn) {
  db.exec("ALTER TABLE env_vars ADD COLUMN visibility TEXT NOT NULL DEFAULT 'plain';");
}

db.close();

console.log('Migration complete: all tables created or already exist.');
