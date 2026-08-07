/**
 * Feats (últimas hazañas) repository.
 */

import { asc, eq } from 'drizzle-orm';
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

/** A feat entry with its DB id (for the admin editor). */
export type FeatAdmin = {
	id: number;
	boss: string;
	raid: Feat['raid'];
	date: string;
	team: string | null;
	firstKill: boolean;
	sort: number;
};

/** Editable fields of a feat entry. */
export type FeatInput = {
	boss: string;
	raid: Feat['raid'];
	date: string;
	team: string | null;
	firstKill: boolean;
	sort: number;
};

/** List every feat WITH its id for the admin editor. */
export async function listFeatsAdmin(db: Db): Promise<FeatAdmin[]> {
	const rows = await db.select().from(feats).orderBy(asc(feats.sort)).all();
	return rows.map((f) => ({
		id: f.id,
		boss: f.boss,
		raid: f.raid as Feat['raid'],
		date: f.date,
		team: f.team,
		firstKill: f.firstKill === 1,
		sort: f.sort
	}));
}

/** Map a FeatInput to the snake_case column shape (firstKill → 0/1). */
function toRow(f: FeatInput) {
	return {
		boss: f.boss,
		raid: f.raid,
		date: f.date,
		team: f.team,
		firstKill: f.firstKill ? 1 : 0,
		sort: f.sort
	};
}

/** Insert a new feat entry. */
export async function createFeat(db: Db, f: FeatInput): Promise<void> {
	await db.insert(feats).values(toRow(f));
}

/** Update an existing feat entry by id. */
export async function updateFeat(db: Db, id: number, f: FeatInput): Promise<void> {
	await db.update(feats).set(toRow(f)).where(eq(feats.id, id));
}

/** Delete a feat entry by id. */
export async function deleteFeat(db: Db, id: number): Promise<void> {
	await db.delete(feats).where(eq(feats.id, id));
}
