-- Jefe de Guerra — D1 schema (guild dynamic content).
-- GENERATED FILE — do not edit by hand.
-- Source of truth: src/lib/server/db/schema.ts  (regenerate: npm run db:schema)
-- Apply: wrangler d1 execute jefe-de-guerra --file=db/schema.sql [--local|--remote]

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS `about_paragraphs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`text` text NOT NULL,
	CONSTRAINT "about_paragraphs_kind" CHECK("about_paragraphs"."kind" IN ('who', 'vibe'))
);

CREATE TABLE IF NOT EXISTS `bosses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`raid_id` text NOT NULL,
	`name` text NOT NULL,
	`defeated` integer DEFAULT 0 NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`raid_id`) REFERENCES `raids`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `community_meta` (
	`id` integer PRIMARY KEY NOT NULL,
	`discord_server_id` text DEFAULT '' NOT NULL,
	`raid_timezone` text DEFAULT 'ST' NOT NULL,
	CONSTRAINT "community_meta_id_singleton" CHECK("community_meta"."id" = 1)
);

CREATE TABLE IF NOT EXISTS `faq` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`q` text NOT NULL,
	`a` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS `feats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`boss` text NOT NULL,
	`raid` text NOT NULL,
	`date` text NOT NULL,
	`team` text,
	`first_kill` integer DEFAULT 0 NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS `guild` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`motto` text NOT NULL,
	`badge` text NOT NULL,
	`faction` text NOT NULL,
	`server` text NOT NULL,
	`game` text NOT NULL,
	`schedule_days` text NOT NULL,
	`schedule_time` text NOT NULL,
	`schedule_timezone` text NOT NULL,
	`schedule_note` text,
	CONSTRAINT "guild_id_singleton" CHECK("guild"."id" = 1)
);

CREATE TABLE IF NOT EXISTS `officers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`wow_class` text NOT NULL,
	`class_label` text NOT NULL,
	`line` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS `phases` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`label` text NOT NULL,
	`status` text NOT NULL,
	`status_label` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "phases_status" CHECK("phases"."status" IN ('completed', 'in-progress', 'upcoming'))
);

CREATE TABLE IF NOT EXISTS `raid_nights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team` text,
	`weekday` integer NOT NULL,
	`time` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS `raids` (
	`id` text PRIMARY KEY NOT NULL,
	`phase_id` text NOT NULL,
	`name` text NOT NULL,
	`abbr` text,
	`sort` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`phase_id`) REFERENCES `phases`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `recruit_needs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`priority` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "recruit_needs_priority" CHECK("recruit_needs"."priority" IN ('alta', 'media', 'baja'))
);

CREATE TABLE IF NOT EXISTS `recruit_requirements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS `recruitment_meta` (
	`id` integer PRIMARY KEY NOT NULL,
	`intro` text NOT NULL,
	`discord_url` text NOT NULL,
	`whatsapp_url` text NOT NULL,
	CONSTRAINT "recruitment_meta_id_singleton" CHECK("recruitment_meta"."id" = 1)
);

CREATE TABLE IF NOT EXISTS `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`schedule_days` text NOT NULL,
	`schedule_time` text NOT NULL,
	`schedule_timezone` text NOT NULL,
	`ssc_kills` integer DEFAULT 0 NOT NULL,
	`ssc_total` integer DEFAULT 6 NOT NULL,
	`tk_kills` integer DEFAULT 0 NOT NULL,
	`tk_total` integer DEFAULT 4 NOT NULL,
	`recruiting` integer DEFAULT 0 NOT NULL,
	`note` text,
	`wcl_guild_id` integer,
	`sort` integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS `wcl_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`json` text NOT NULL,
	`fetched_at` integer NOT NULL
);
