/**
 * Community repository: the singleton `community_meta` row and the recurring
 * raid nights used by the countdown.
 *
 * `discordInvite` is intentionally NOT returned here — it mirrors the
 * recruitment Discord URL and is wired by the orchestrator (`data.ts`).
 */

import { asc } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { communityMeta, raidNights } from '$lib/server/db/schema';
import type { RaidNight } from '$lib/data/community';

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
