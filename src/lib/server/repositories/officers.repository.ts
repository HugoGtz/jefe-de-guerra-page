/**
 * Officers (Consejo de Guerra) repository.
 */

import { asc } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { officers } from '$lib/server/db/schema';
import type { Officer } from '$lib/data/officers';

/**
 * Load every officer in display order. Empty strings for class/line (unknown)
 * map to `undefined` so the UI hides them, matching the previous behavior.
 */
export async function getOfficers(db: Db): Promise<Officer[]> {
	const rows = await db.select().from(officers).orderBy(asc(officers.sort)).all();
	return rows.map((o) => ({
		name: o.name,
		role: o.role,
		wowClass: (o.wowClass || undefined) as Officer['wowClass'],
		classLabel: o.classLabel || undefined,
		line: o.line || undefined
	}));
}
