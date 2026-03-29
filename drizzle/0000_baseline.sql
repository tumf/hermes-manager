CREATE TABLE IF NOT EXISTS `agents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`home` text NOT NULL,
	`label` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')*1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now')*1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `agents_name_unique` ON `agents` (`name`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `env_vars` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scope` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`visibility` text DEFAULT 'plain' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `skill_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent` text NOT NULL,
	`source_path` text NOT NULL,
	`target_path` text NOT NULL
);
