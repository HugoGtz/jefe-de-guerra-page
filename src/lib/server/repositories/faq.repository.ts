/**
 * FAQ repository.
 */

import { asc, eq } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { faq } from '$lib/server/db/schema';
import type { FaqItem } from '$lib/data/faq';

/** A FAQ entry with its DB id + sort (for the admin editor). */
export type FaqAdmin = { id: number; q: string; a: string; sort: number };

/** Editable fields of a FAQ entry. */
export type FaqInput = { q: string; a: string; sort: number };

/** Load every FAQ entry in display order. */
export async function getFaq(db: Db): Promise<FaqItem[]> {
	const rows = await db.select().from(faq).orderBy(asc(faq.sort)).all();
	return rows.map((f) => ({ q: f.q, a: f.a }));
}

/** List FAQ entries WITH their ids + sort for the admin editor. */
export async function listFaqAdmin(db: Db): Promise<FaqAdmin[]> {
	const rows = await db.select().from(faq).orderBy(asc(faq.sort)).all();
	return rows.map((f) => ({ id: f.id, q: f.q, a: f.a, sort: f.sort }));
}

/** Insert a new FAQ entry. */
export async function createFaq(db: Db, f: FaqInput): Promise<void> {
	await db.insert(faq).values(f);
}

/** Update an existing FAQ entry by id. */
export async function updateFaq(db: Db, id: number, f: FaqInput): Promise<void> {
	await db.update(faq).set(f).where(eq(faq.id, id));
}

/** Delete a FAQ entry by id. */
export async function deleteFaq(db: Db, id: number): Promise<void> {
	await db.delete(faq).where(eq(faq.id, id));
}
