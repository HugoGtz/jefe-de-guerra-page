/**
 * Guild identity repository. Reads the singleton `guild` row plus its about
 * paragraphs and maps them into the `Guild` domain model.
 */

import { asc, eq } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { guild, aboutParagraphs } from '$lib/server/db/schema';
import type { Guild } from '$lib/data/guild';

/** Editable identity + schedule fields of the singleton guild row (id=1). */
export type GuildUpdate = {
	name: string;
	motto: string;
	badge: string;
	faction: string;
	server: string;
	game: string;
	scheduleDays: string;
	scheduleTime: string;
	scheduleTimezone: string;
	scheduleNote: string | null;
};

/**
 * Load the guild identity (id=1). Returns `null` when the singleton row is
 * missing, so the orchestrator can fall back to static data.
 */
export async function getGuild(db: Db): Promise<Guild | null> {
	const [row, about] = await Promise.all([
		db.select().from(guild).limit(1).get(),
		db.select().from(aboutParagraphs).orderBy(asc(aboutParagraphs.kind), asc(aboutParagraphs.sort)).all()
	]);

	if (!row) return null;

	return {
		name: row.name,
		motto: row.motto,
		badge: row.badge,
		faction: row.faction,
		server: row.server,
		game: row.game,
		aboutWhoWeAre: about.filter((r) => r.kind === 'who').map((r) => r.text),
		aboutVibe: about.filter((r) => r.kind === 'vibe').map((r) => r.text),
		schedule: {
			days: row.scheduleDays,
			time: row.scheduleTime,
			timezone: row.scheduleTimezone,
			note: row.scheduleNote ?? undefined
		}
	};
}

/** Update the singleton guild identity + schedule (id=1). */
export async function updateGuild(db: Db, fields: GuildUpdate): Promise<void> {
	await db
		.update(guild)
		.set({
			name: fields.name,
			motto: fields.motto,
			badge: fields.badge,
			faction: fields.faction,
			server: fields.server,
			game: fields.game,
			scheduleDays: fields.scheduleDays,
			scheduleTime: fields.scheduleTime,
			scheduleTimezone: fields.scheduleTimezone,
			scheduleNote: fields.scheduleNote
		})
		.where(eq(guild.id, 1));
}

/**
 * Replace ALL about paragraphs with the given lists, preserving order via the
 * `sort` column. `who` → "quiénes somos", `vibe` → "ambiente". Blank entries are
 * dropped. Delete-then-insert keeps the list in sync with the editor exactly.
 */
export async function setAboutParagraphs(
	db: Db,
	who: string[],
	vibe: string[]
): Promise<void> {
	await db.delete(aboutParagraphs);

	const rows = [
		...who
			.map((t) => t.trim())
			.filter((t) => t.length > 0)
			.map((text, i) => ({ kind: 'who', sort: i, text })),
		...vibe
			.map((t) => t.trim())
			.filter((t) => t.length > 0)
			.map((text, i) => ({ kind: 'vibe', sort: i, text }))
	];

	if (rows.length > 0) await db.insert(aboutParagraphs).values(rows);
}
