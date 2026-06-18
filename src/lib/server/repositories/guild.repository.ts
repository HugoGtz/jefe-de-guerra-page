/**
 * Guild identity repository. Reads the singleton `guild` row plus its about
 * paragraphs and maps them into the `Guild` domain model.
 */

import { asc } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { guild, aboutParagraphs } from '$lib/server/db/schema';
import type { Guild } from '$lib/data/guild';

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
