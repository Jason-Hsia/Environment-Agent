CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`question` text NOT NULL,
	`response` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_conversations_owner_created` ON `conversations` (`owner`,`created`);--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`conversation` text NOT NULL,
	`reason` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`doc_id` text NOT NULL,
	`hash` text,
	`state` text NOT NULL,
	`detail` text NOT NULL,
	`created` text NOT NULL,
	`reviewed` integer DEFAULT 0 NOT NULL,
	`reviewer` text
);
--> statement-breakpoint
CREATE INDEX `idx_source_checks_doc_created` ON `source_checks` (`doc_id`,`created`);