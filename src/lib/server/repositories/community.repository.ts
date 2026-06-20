/**
 * Community repository: the singleton `community_meta` row and the recurring
 * raid nights used by the countdown.
 *
 * `discordInvite` is intentionally NOT returned here — it mirrors the
 * recruitment Discord URL and is wired by the orchestrator (`data.ts`).
 */

import { asc, eq } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { communityMeta, raidNights } from '$lib/server/db/schema';
import type { RaidNight } from '$lib/data/community';

/** Editable singleton community meta fields. */
export type CommunityMetaUpdate = {
	discordServerId: string;
	raidTimezone: string;
};

/** Discord widget + raid timezone for the community section. */
export type CommunityMeta = {
	discordServerId: string;
	raidTimezone: string;
};

/**
 * Load the community meta singleton (id=1). Returns `null` when missing, so the
 * orchestrator can fall back to static data.
 */
export async function getCommunityMeta(db: Db): Promise<CommunityMeta | null> {
	const row = await db.select().from(communityMeta).limit(1).get();
	if (!row) return null;
	return {
		discordServerId: row.discordServerId,
		raidTimezone: row.raidTimezone
	};
}

/** Load the recurring raid nights in display order. */
export async function getRaidNights(db: Db): Promise<RaidNight[]> {
	const rows = await db.select().from(raidNights).orderBy(asc(raidNights.sort)).all();
	return rows.map((n) => ({
		team: n.team ?? undefined,
		weekday: n.weekday,
		time: n.time
	}));
}

/** Update the singleton community meta (id=1). */
export async function updateCommunityMeta(
	db: Db,
	fields: CommunityMetaUpdate
): Promise<void> {
	await db
		.update(communityMeta)
		.set({
			discordServerId: fields.discordServerId,
			raidTimezone: fields.raidTimezone
		})
		.where(eq(communityMeta.id, 1));
}

/**
 * Replace the entire list of recurring raid nights, preserving order via the
 * `sort` column. Empty/blank time entries are dropped.
 */
export async function setRaidNights(db: Db, nights: RaidNight[]): Promise<void> {
	await db.delete(raidNights);
	const rows = nights
		.filter((n) => typeof n.time === 'string' && n.time.trim().length > 0)
		.map((n, i) => ({
			team: n.team && n.team.trim().length > 0 ? n.team.trim() : null,
			weekday: n.weekday,
			time: n.time.trim(),
			sort: i
		}));
	if (rows.length > 0) await db.insert(raidNights).values(rows);
}
