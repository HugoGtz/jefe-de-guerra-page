/**
 * WarcraftLogs cache repository. Thin typed wrapper over the `wcl_cache` table
 * (key → raw JSON payload + fetch timestamp). The orchestrator owns the TTL
 * logic, JSON (de)serialization and stale-fallback policy; this repo only does
 * the read and the upsert.
 *
 * Reads are best-effort: if the table doesn't exist yet (fresh D1), `getCache`
 * returns `null` rather than throwing, matching the previous try/catch behavior.
 */

import { eq } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { wclCache } from '$lib/server/db/schema';

/** A cache hit: the raw JSON string and when it was fetched (epoch ms). */
export type CacheEntry = { json: string; fetchedAt: number };

/**
 * Read a cache entry by key. Returns `null` on miss or on any read error (e.g.
 * the table not existing yet), so callers can proceed to a fresh fetch.
 */
export async function getCache(db: Db, key: string): Promise<CacheEntry | null> {
	try {
		const row = await db
			.select({ json: wclCache.json, fetchedAt: wclCache.fetchedAt })
			.from(wclCache)
			.where(eq(wclCache.key, key))
			.limit(1)
			.get();
		if (!row) return null;
		return { json: row.json, fetchedAt: row.fetchedAt };
	} catch {
		return null;
	}
}

/**
 * Upsert a cache entry (insert or overwrite by key). Caching is best-effort:
 * this never throws — write failures are swallowed.
 */
export async function setCache(
	db: Db,
	key: string,
	json: string,
	fetchedAt: number
): Promise<void> {
	try {
		await db
			.insert(wclCache)
			.values({ key, json, fetchedAt })
			.onConflictDoUpdate({
				target: wclCache.key,
				set: { json, fetchedAt }
			});
	} catch {
		// Best-effort cache write; ignore failures.
	}
}
