/**
 * WarcraftLogs cache repository. Thin typed wrapper over the `wcl_cache` table
 * (key → raw JSON payload + fetch timestamp). The orchestrator owns the TTL
 * logic, JSON (de)serialization and stale-fallback policy; this repo only does
 * the read and the upsert.
 *
 * Reads are best-effort: if the table doesn't exist yet (fresh D1), `getCache`
 * returns `null` rather than throwing, matching the previous try/catch behavior.
 */

import { eq, sql } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { wclCache } from '$lib/server/db/schema';

/** Default single-flight lease: comfortably covers the slowest WCL pipeline
 *  (rankings' several chunked round-trips). */
const DEFAULT_LEASE_MS = 30_000;

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
		// Clears any lease left over from `tryAcquireLock` — a successful write is
		// the natural release, so the next stale read doesn't wait out the lease.
		await db
			.insert(wclCache)
			.values({ key, json, fetchedAt, lockedUntil: null })
			.onConflictDoUpdate({
				target: wclCache.key,
				set: { json, fetchedAt, lockedUntil: null }
			});
	} catch {
		// Best-effort cache write; ignore failures.
	}
}

/**
 * Best-effort single-flight lock for a cache key. Returns true iff THIS call
 * acquired the lock (the row's `lockedUntil` was null/expired and got bumped to
 * `now + leaseMs` in one atomic upsert) — so a stale key under concurrent
 * requests only triggers one live WCL refetch; the rest serve the stale value.
 *
 * FAILS OPEN: any error acquiring the lock is treated as "acquired" so a broken
 * lock primitive never blocks a legitimate fetch — worst case is today's
 * behavior (every stale request refetches).
 */
export async function tryAcquireLock(
	db: Db,
	key: string,
	now: number,
	leaseMs = DEFAULT_LEASE_MS
): Promise<boolean> {
	try {
		const result = await db
			.insert(wclCache)
			.values({ key, json: '', fetchedAt: 0, lockedUntil: now + leaseMs })
			.onConflictDoUpdate({
				target: wclCache.key,
				set: { lockedUntil: now + leaseMs },
				where: sql`${wclCache.lockedUntil} IS NULL OR ${wclCache.lockedUntil} < ${now}`
			});
		const changes = (result as { meta?: { changes?: number } })?.meta?.changes ?? 0;
		return changes > 0;
	} catch {
		return true;
	}
}

/**
 * Delete a cache row by key (admin "refresh now" action) — the next
 * `cacheThrough` read treats it as a miss and fetches live. Best-effort:
 * never throws.
 */
export async function deleteCache(db: Db, key: string): Promise<void> {
	try {
		await db.delete(wclCache).where(eq(wclCache.key, key));
	} catch {
		// Best-effort; ignore failures.
	}
}
