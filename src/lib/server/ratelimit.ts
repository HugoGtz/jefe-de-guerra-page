/**
 * Best-effort fixed-window rate limit, extracted pure (read/write injected) so
 * it is unit-testable and storage-agnostic. The apply endpoint backs it with the
 * generic `wcl_cache` KV table.
 *
 * Fail-open by construction: a missing/unreadable row starts a fresh window and
 * allows the request — a public form must never lock out real users when the
 * store is down. This is a spam deterrent, NOT a hard security boundary;
 * concurrent bursts may undercount (D1 reads/writes here aren't transactional).
 */

export type RateLimitResult = { allowed: boolean; retryAfterMs: number };

export type RateLimitOptions = {
	/** Current epoch ms (injected for deterministic tests). */
	now: number;
	/** Max allowed requests within the window. */
	limit: number;
	/** Window length in ms. */
	windowMs: number;
	/** Read the current counter row (count as JSON, fetchedAt = window start). */
	read: () => Promise<{ json: string; fetchedAt: number } | null>;
	/** Persist the counter for the current window. Best-effort. */
	write: (json: string, windowStart: number) => Promise<void>;
};

export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
	const { now, limit, windowMs, read, write } = opts;

	const row = await read();

	// Still inside an active window → increment and enforce.
	if (row && now - row.fetchedAt < windowMs) {
		let count: number;
		try {
			count = (JSON.parse(row.json) as { count?: number }).count ?? 0;
		} catch {
			count = 0;
		}
		count += 1;

		if (count > limit) {
			return { allowed: false, retryAfterMs: windowMs - (now - row.fetchedAt) };
		}

		await write(JSON.stringify({ count }), row.fetchedAt);
		return { allowed: true, retryAfterMs: 0 };
	}

	// New window (no row, expired, or unreadable) → allow and start counting.
	await write(JSON.stringify({ count: 1 }), now);
	return { allowed: true, retryAfterMs: 0 };
}
