import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';

export const agents = sqliteTable('agents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  agentId: text('agent_id').notNull().unique(),
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
  scope: text('scope').notNull(), // "global" | agent id
  key: text('key').notNull(),
  value: text('value').notNull(),
  visibility: text('visibility').notNull().default('plain'), // "plain" | "secure"
});

export const skillLinks = sqliteTable('skill_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  agent: text('agent').notNull(),
  sourcePath: text('source_path').notNull(),
  targetPath: text('target_path').notNull(),
});

export const templates = sqliteTable(
  'templates',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    fileType: text('file_type').notNull(), // 'agents.md' | 'soul.md' | 'config.yaml'
    name: text('name').notNull(),
    content: text('content').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(strftime('%s','now')*1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(strftime('%s','now')*1000)`),
  },
  (table) => [unique().on(table.fileType, table.name)],
);
