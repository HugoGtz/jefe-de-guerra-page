/**
 * FAQ repository.
 */

import { asc } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { faq } from '$lib/server/db/schema';
import type { FaqItem } from '$lib/data/faq';

/** Load every FAQ entry in display order. */
export async function getFaq(db: Db): Promise<FaqItem[]> {
	const rows = await db.select().from(faq).orderBy(asc(faq.sort)).all();
	return rows.map((f) => ({ q: f.q, a: f.a }));
}
