/**
 * Cache-through algorithm, extracted pure (no D1 dependency) so it is
 * unit-testable and shared by every WCL loader in `data.ts`.
 *
 * Policy (identical for all callers):
 *   1. If a cache row exists and is within `ttlMs`, return its parsed value.
 *   2. Otherwise fetch a live value; on success persist it (best-effort) and
 *      return it.
 *   3. On fetch failure, fall back to the stale cache row if there is one.
 *   4. Nothing anywhere → null.
 *
 * A fresh row whose `parse` returns null (corrupt JSON) is treated as a miss
 * and triggers a re-fetch. Reads/writes/fetches are injected, so this never
 * touches the database directly.
 */

export type CacheRow = { json: string; fetchedAt: number };

export type CacheThroughOptions<T> = {
	/** Current epoch ms (injected so tests are deterministic). */
	now: number;
	/** Freshness window in ms. */
	ttlMs: number;
	/** Read the current cache row, or null if absent. */
	read: () => Promise<CacheRow | null>;
	/** Persist a fresh serialized payload. Best-effort — failures are swallowed. */
	write: (json: string) => Promise<void>;
	/** Fetch a live value, or null when unavailable. */
	fetch: () => Promise<T | null>;
	/** Parse a stored payload; return null to treat it as corrupt. Defaults to JSON.parse. */
	parse?: (json: string) => T | null;
	/** Serialize a value for storage. Defaults to JSON.stringify. */
	serialize?: (value: T) => string;
};

function defaultParse<T>(json: string): T | null {
	try {
		return JSON.parse(json) as T;
	} catch {
		return null;
	}
}

export async function cacheThrough<T>(opts: CacheThroughOptions<T>): Promise<T | null> {
	const { now, ttlMs, read, write, fetch } = opts;
	const parse = opts.parse ?? defaultParse<T>;
	const serialize = opts.serialize ?? ((value: T) => JSON.stringify(value));

	const row = await read();

	if (row && now - row.fetchedAt < ttlMs) {
		const fresh = parse(row.json);
		if (fresh !== null) return fresh;
	}

	let fetched: T | null;
	try {
		fetched = await fetch();
	} catch {
		fetched = null;
	}

	if (fetched !== null) {
		try {
			await write(serialize(fetched));
		} catch {
			// Persisting is best-effort; a write failure must not fail the read.
		}
		return fetched;
	}

	// Fetch failed → serve stale if we have any cached row at all.
	if (row) return parse(row.json);
	return null;
}
