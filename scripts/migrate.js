#!/usr/bin/env node

const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

function getRuntimeDataRootPath(...segments) {
  return path.join(process.cwd(), 'runtime', 'data', ...segments);
}

const dataDir = getRuntimeDataRootPath();
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = getRuntimeDataRootPath('app.db');
const db = new Database(dbPath);

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
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS skill_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent TEXT NOT NULL,
    source_path TEXT NOT NULL,
    target_path TEXT NOT NULL
  );
`);

db.close();

console.log(`Migration complete: ${dbPath}`);
