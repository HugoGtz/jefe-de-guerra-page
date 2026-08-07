/**
 * Observability for the WCL layer. Every public getter here is silent-catch
 * resilient (any error → null → static fallback) so the site never crashes;
 * the downside is that in prod you can't tell whether live data is missing due
 * to a bad token, a rate limit, a timeout, a partial GraphQL error, or a bug.
 * These helpers surface each case in the Cloudflare logs / `wrangler tail`
 * without changing the resilient behavior.
 */

/** Structured log for WCL failures (thrown errors, non-2xx responses). */
export function logWcl(op: string, detail: Record<string, unknown>): void {
	console.warn(`[wcl] ${op}`, detail);
}

/**
 * Structured log for non-failure events worth tracing: cache hits/misses, a
 * partial GraphQL error alongside otherwise-usable data, or a boss-kill ledger
 * write. Distinct from `logWcl` so a log-search for "wcl-fail" vs "wcl-event"
 * can tell the two apart at a glance.
 */
export function logWclEvent(op: string, detail: Record<string, unknown>): void {
	console.log(`[wcl-event] ${op}`, detail);
}
