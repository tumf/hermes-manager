-- Migration: rename agents.name -> agents.agent_id, add templates table
-- Guard: skip RENAME if agent_id column already exists (idempotent for partially-migrated DBs)

-- Step 1: Rename name -> agent_id (only if name column still exists)
-- SQLite 3.25.0+ required for RENAME COLUMN
-- We check via a pragma-based approach in the migration runner;
-- here we simply run the ALTER and rely on IF NOT EXISTS for index/table.
ALTER TABLE `agents` RENAME COLUMN `name` TO `agent_id`;
--> statement-breakpoint
DROP INDEX IF EXISTS `agents_name_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `agents_agent_id_unique` ON `agents` (`agent_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_type` text NOT NULL,
	`name` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')*1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now')*1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `templates_file_type_name_unique` ON `templates` (`file_type`,`name`);
