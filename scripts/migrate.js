#!/usr/bin/env node
/* global Set */

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

function getRuntimeDataPath(...segments) {
  return path.join(process.cwd(), 'runtime', 'data', ...segments);
}

function ensureDirectories() {
  for (const dir of ['runtime/agents', 'runtime/globals', 'runtime/data', 'runtime/logs']) {
    fs.mkdirSync(path.join(process.cwd(), dir), { recursive: true });
  }
}

function getMigrationFiles() {
  const migrationsDir = path.join(process.cwd(), 'drizzle');
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS __migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
    )
  `);
}

function getAppliedMigrations(db) {
  return new Set(
    db
      .prepare('SELECT name FROM __migrations')
      .all()
      .map((r) => r.name),
  );
}

function splitStatements(sql) {
  return sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function execSafe(db, stmt) {
  try {
    db.exec(stmt);
  } catch (err) {
    const msg = err.message || '';
    if (/no such column|duplicate column name/i.test(msg)) {
      console.log(
        `[migrate]   skipped (already applied): ${stmt.slice(0, 60).replace(/\n/g, ' ')}...`,
      );
      return;
    }
    throw err;
  }
}

function applyMigration(db, name, sqlContent) {
  const statements = splitStatements(sqlContent);
  const tx = db.transaction(() => {
    for (const stmt of statements) {
      execSafe(db, stmt);
    }
    db.prepare('INSERT INTO __migrations (name) VALUES (?)').run(name);
  });
  tx();
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const verbose = process.argv.includes('--verbose');

  ensureDirectories();

  const dbPath = getRuntimeDataPath('app.db');
  console.log(`[migrate] db: ${dbPath}`);

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  try {
    ensureMigrationsTable(db);
    const applied = getAppliedMigrations(db);
    const files = getMigrationFiles();

    let count = 0;
    for (const file of files) {
      const name = file.replace(/\.sql$/, '');
      if (applied.has(name)) {
        if (verbose) console.log(`[migrate] skip (applied): ${name}`);
        continue;
      }

      const sqlContent = fs.readFileSync(path.join(process.cwd(), 'drizzle', file), 'utf-8');

      if (dryRun) {
        console.log(`[migrate] would apply: ${name}`);
        continue;
      }

      console.log(`[migrate] applying: ${name}`);
      applyMigration(db, name, sqlContent);
      count++;
    }

    console.log(`[migrate] done (${count} applied, ${applied.size + count} total)`);
  } finally {
    db.close();
  }
}

main();
