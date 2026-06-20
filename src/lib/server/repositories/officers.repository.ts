/**
 * Officers (Consejo de Guerra) repository.
 */

import { asc, eq } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { officers } from '$lib/server/db/schema';
import type { Officer } from '$lib/data/officers';

/**
 * Editable fields of an officer. `wowClass`/`classLabel`/`line` are stored as
 * empty strings when absent (the read mapper turns '' back into undefined and
 * WCL enrichment fills class/spec at request time).
 */
export type OfficerInput = {
	name: string;
	role: string;
	wowClass: string;
	classLabel: string;
	line: string;
	sort: number;
};

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

/** Officer with its DB id + raw editable fields (for the admin editor). */
export type OfficerAdmin = OfficerInput & { id: number };

/**
 * List officers WITH their ids and raw column values (no WCL enrichment) for the
 * admin editor. Empty strings stay as-is so the form round-trips faithfully.
 */
export async function listOfficersAdmin(db: Db): Promise<OfficerAdmin[]> {
	const rows = await db.select().from(officers).orderBy(asc(officers.sort)).all();
	return rows.map((o) => ({
		id: o.id,
		name: o.name,
		role: o.role,
		wowClass: o.wowClass,
		classLabel: o.classLabel,
		line: o.line,
		sort: o.sort
	}));
}

/** Insert a new officer. */
export async function createOfficer(db: Db, o: OfficerInput): Promise<void> {
	await db.insert(officers).values(o);
}

/** Update an existing officer by numeric id. */
export async function updateOfficer(db: Db, id: number, o: OfficerInput): Promise<void> {
	await db.update(officers).set(o).where(eq(officers.id, id));
}

/** Delete an officer by numeric id. */
export async function deleteOfficer(db: Db, id: number): Promise<void> {
	await db.delete(officers).where(eq(officers.id, id));
}
