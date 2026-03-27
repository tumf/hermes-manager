import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const agents = sqliteTable('agents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  home: text('home').notNull(),
  label: text('label').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(strftime('%s','now')*1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(strftime('%s','now')*1000)`),
});

export const envVars = sqliteTable('env_vars', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  scope: text('scope').notNull(), // "global" | agent name
  key: text('key').notNull(),
  value: text('value').notNull(),
});

export const skillLinks = sqliteTable('skill_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  agent: text('agent').notNull(),
  sourcePath: text('source_path').notNull(),
  targetPath: text('target_path').notNull(),
});
