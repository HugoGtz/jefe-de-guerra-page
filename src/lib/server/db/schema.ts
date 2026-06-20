/**
 * Drizzle ORM schema — SINGLE SOURCE OF TRUTH for the guild's D1 structure.
 *
 * This file mirrors `db/schema.sql` exactly (tables, columns, CHECK constraints,
 * defaults, foreign keys, AUTOINCREMENT and the `id = 1` singleton checks). The
 * SQL DDL in `db/schema.sql` is a GENERATED artifact produced from this file via
 * `npm run db:schema` (drizzle-kit export). Edit the schema HERE, never the SQL.
 *
 * Columns are snake_case to match the on-disk D1 layout; the inferred row types
 * are exported at the bottom so repositories can map them to the domain models
 * in `$lib/data/*` without leaking Drizzle types to the UI.
 */

import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, check } from 'drizzle-orm/sqlite-core';

// ── Guild identity (singleton row id=1) ──────────────────────────────────────
export const guild = sqliteTable(
	'guild',
	{
		id: integer('id').primaryKey(),
		name: text('name').notNull(),
		motto: text('motto').notNull(),
		badge: text('badge').notNull(),
		faction: text('faction').notNull(),
		server: text('server').notNull(),
		game: text('game').notNull(),
		scheduleDays: text('schedule_days').notNull(),
		scheduleTime: text('schedule_time').notNull(),
		scheduleTimezone: text('schedule_timezone').notNull(),
		scheduleNote: text('schedule_note')
	},
	(t) => [check('guild_id_singleton', sql`${t.id} = 1`)]
);

/** About paragraphs: kind = 'who' (quiénes somos) | 'vibe' (ambiente). */
export const aboutParagraphs = sqliteTable(
	'about_paragraphs',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		kind: text('kind').notNull(),
		sort: integer('sort').notNull().default(0),
		text: text('text').notNull()
	},
	(t) => [check('about_paragraphs_kind', sql`${t.kind} IN ('who', 'vibe')`)]
);

// ── Raid progression ─────────────────────────────────────────────────────────
export const phases = sqliteTable(
	'phases',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		label: text('label').notNull(),
		status: text('status').notNull(),
		statusLabel: text('status_label').notNull(),
		sort: integer('sort').notNull().default(0)
	},
	(t) => [
		check(
			'phases_status',
			sql`${t.status} IN ('completed', 'in-progress', 'upcoming')`
		)
	]
);

export const raids = sqliteTable('raids', {
	id: text('id').primaryKey(),
	phaseId: text('phase_id')
		.notNull()
		.references(() => phases.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	abbr: text('abbr'),
	sort: integer('sort').notNull().default(0)
});

export const bosses = sqliteTable('bosses', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	raidId: text('raid_id')
		.notNull()
		.references(() => raids.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	defeated: integer('defeated').notNull().default(0),
	sort: integer('sort').notNull().default(0)
});

// ── Raid teams (Cores) ───────────────────────────────────────────────────────
export const teams = sqliteTable('teams', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	scheduleDays: text('schedule_days').notNull(),
	scheduleTime: text('schedule_time').notNull(),
	scheduleTimezone: text('schedule_timezone').notNull(),
	sscKills: integer('ssc_kills').notNull().default(0),
	sscTotal: integer('ssc_total').notNull().default(6),
	tkKills: integer('tk_kills').notNull().default(0),
	tkTotal: integer('tk_total').notNull().default(4),
	recruiting: integer('recruiting').notNull().default(0),
	note: text('note'),
	wclGuildId: integer('wcl_guild_id'),
	sort: integer('sort').notNull().default(0)
});

// ── Officers ─────────────────────────────────────────────────────────────────
export const officers = sqliteTable('officers', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	role: text('role').notNull(),
	wowClass: text('wow_class').notNull(),
	classLabel: text('class_label').notNull(),
	line: text('line').notNull(),
	sort: integer('sort').notNull().default(0)
});

// ── Recruitment ──────────────────────────────────────────────────────────────
export const recruitmentMeta = sqliteTable(
	'recruitment_meta',
	{
		id: integer('id').primaryKey(),
		intro: text('intro').notNull(),
		discordUrl: text('discord_url').notNull(),
		whatsappUrl: text('whatsapp_url').notNull()
	},
	(t) => [check('recruitment_meta_id_singleton', sql`${t.id} = 1`)]
);

export const recruitNeeds = sqliteTable(
	'recruit_needs',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		label: text('label').notNull(),
		priority: text('priority').notNull(),
		sort: integer('sort').notNull().default(0)
	},
	(t) => [
		check('recruit_needs_priority', sql`${t.priority} IN ('alta', 'media', 'baja')`)
	]
);

export const recruitRequirements = sqliteTable('recruit_requirements', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	text: text('text').notNull(),
	sort: integer('sort').notNull().default(0)
});

// ── Feats (últimas hazañas / kills) ──────────────────────────────────────────
export const feats = sqliteTable('feats', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	boss: text('boss').notNull(),
	raid: text('raid').notNull(),
	date: text('date').notNull(),
	team: text('team'),
	firstKill: integer('first_kill').notNull().default(0),
	sort: integer('sort').notNull().default(0)
});

// ── FAQ ──────────────────────────────────────────────────────────────────────
export const faq = sqliteTable('faq', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	q: text('q').notNull(),
	a: text('a').notNull(),
	sort: integer('sort').notNull().default(0)
});

// ── Community (Discord widget + raid nights for the countdown) ───────────────
export const communityMeta = sqliteTable(
	'community_meta',
	{
		id: integer('id').primaryKey(),
		discordServerId: text('discord_server_id').notNull().default(''),
		raidTimezone: text('raid_timezone').notNull().default('ST')
	},
	(t) => [check('community_meta_id_singleton', sql`${t.id} = 1`)]
);

export const raidNights = sqliteTable('raid_nights', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	team: text('team'),
	weekday: integer('weekday').notNull(),
	time: text('time').notNull(),
	sort: integer('sort').notNull().default(0)
});

// ── Admin users (panel de oficiales) ─────────────────────────────────────────
// Replaces the single shared password. Any user is equal (flat roles): can edit
// content AND manage other users. `must_change_password` forces onboarding on
// first login. The password hash is PBKDF2 (see $lib/server/password.ts) and is
// NEVER exposed to the client.
export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	mustChangePassword: integer('must_change_password').notNull().default(0),
	/** epoch ms (Date.now()) */
	createdAt: integer('created_at').notNull()
});

// ── WarcraftLogs cache (progreso + hazañas agregados de los 7 cores) ─────────
export const wclCache = sqliteTable('wcl_cache', {
	key: text('key').primaryKey(),
	json: text('json').notNull(),
	/** epoch ms (Date.now()) */
	fetchedAt: integer('fetched_at').notNull()
});

// ── Inferred row types (for repository mappers) ──────────────────────────────
export type GuildRow = typeof guild.$inferSelect;
export type AboutParagraphRow = typeof aboutParagraphs.$inferSelect;
export type PhaseRow = typeof phases.$inferSelect;
export type RaidRow = typeof raids.$inferSelect;
export type BossRow = typeof bosses.$inferSelect;
export type TeamRow = typeof teams.$inferSelect;
export type OfficerRow = typeof officers.$inferSelect;
export type RecruitmentMetaRow = typeof recruitmentMeta.$inferSelect;
export type RecruitNeedRow = typeof recruitNeeds.$inferSelect;
export type RecruitRequirementRow = typeof recruitRequirements.$inferSelect;
export type FeatRow = typeof feats.$inferSelect;
export type FaqRow = typeof faq.$inferSelect;
export type CommunityMetaRow = typeof communityMeta.$inferSelect;
export type RaidNightRow = typeof raidNights.$inferSelect;
export type WclCacheRow = typeof wclCache.$inferSelect;
export type UserRow = typeof users.$inferSelect;
