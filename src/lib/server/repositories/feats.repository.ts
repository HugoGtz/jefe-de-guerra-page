/**
 * Feats (últimas hazañas) repository.
 */

import { asc } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { feats } from '$lib/server/db/schema';
import type { Feat } from '$lib/data/kills';

/** Load every feat in display order (sort = newest-first as seeded). */
export async function getFeats(db: Db): Promise<Feat[]> {
	const rows = await db.select().from(feats).orderBy(asc(feats.sort)).all();
	return rows.map((f) => ({
		boss: f.boss,
		raid: f.raid as Feat['raid'],
		date: f.date,
		team: f.team ?? undefined,
		firstKill: f.firstKill === 1
	}));
}
