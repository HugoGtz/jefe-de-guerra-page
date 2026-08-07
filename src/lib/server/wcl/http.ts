/**
 * OAuth token handling + the single GraphQL runner used by every WCL pipeline,
 * plus a short, bounded retry helper for transient failures.
 *
 * Retry policy: at most 2 retries, short fixed delays (200ms/600ms), only for
 * 429/5xx — never for 4xx auth errors (retrying a bad token just wastes the
 * request's CPU budget). This is sized for Cloudflare Workers' request-scoped
 * CPU/wall-time limits: the added worst-case latency is under a second.
 *
 * Empirically confirmed (via a live probe against the real WCL API) that a
 * sustained rate-limit block can last well beyond what any short retry could
 * paper over — these retries are for transient blips only. Against a real
 * sustained block they fail fast and the caller's existing null/stale-cache
 * fallback takes over, which is the correct behavior.
 */

import type { WclEnv } from './types';
import { OAUTH_URL, GRAPHQL_URL } from './constants';
import { logWcl, logWclEvent } from './logging';

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

type RetryableFetch = () => Promise<Response>;

const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [200, 600];

/** Run `run()`, retrying on 429/5xx or a thrown network error. Returns the last
 *  Response (even if non-ok) once retries are exhausted, or null if every
 *  attempt threw. */
async function fetchWithRetry(run: RetryableFetch, label: string): Promise<Response | null> {
	for (let attempt = 0; ; attempt++) {
		let res: Response;
		try {
			res = await run();
		} catch (e) {
			if (attempt >= RETRY_DELAYS_MS.length) {
				logWcl(label, { error: e instanceof Error ? e.message : String(e) });
				return null;
			}
			await sleep(RETRY_DELAYS_MS[attempt]);
			continue;
		}
		if (res.ok || !RETRY_STATUS.has(res.status) || attempt >= RETRY_DELAYS_MS.length) {
			return res;
		}
		await sleep(RETRY_DELAYS_MS[attempt]);
	}
}

// ── OAuth token cache (module-level; best-effort within a warm isolate) ──────

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getToken(env: WclEnv): Promise<string | null> {
	const { WCL_CLIENT_ID, WCL_CLIENT_SECRET } = env;
	if (!WCL_CLIENT_ID || !WCL_CLIENT_SECRET) return null;

	// Reuse the cached token until ~60s before it expires.
	if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
		return cachedToken.value;
	}

	const basic = btoa(`${WCL_CLIENT_ID}:${WCL_CLIENT_SECRET}`);
	const res = await fetchWithRetry(
		() =>
			fetch(OAUTH_URL, {
				method: 'POST',
				headers: {
					Authorization: `Basic ${basic}`,
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: 'grant_type=client_credentials'
			}),
		'token'
	);
	if (!res || !res.ok) {
		// 401/403 → bad client creds; 429 → rate limited.
		logWcl('token', { status: res?.status });
		return null;
	}

	const json = (await res.json()) as { access_token?: string; expires_in?: number };
	if (!json.access_token) return null;

	const ttlMs = (json.expires_in ?? 3600) * 1000;
	cachedToken = { value: json.access_token, expiresAt: Date.now() + ttlMs };
	return cachedToken.value;
}

// ── GraphQL runner ────────────────────────────────────────────────────────────

type GqlErrorEntry = { message?: string; path?: Array<string | number> };

/**
 * Run a GraphQL query against the WCL client API. Returns parsed `data` or
 * null. A partial error (e.g. one aliased block failing while others succeed)
 * does NOT fail the whole call — that resilience is intentional, matching the
 * project's "one bad core must not blank out the whole page" convention — but
 * it IS logged with the failing alias path(s) so it's diagnosable without
 * redeploying.
 */
export async function gql<T>(token: string, query: string): Promise<T | null> {
	const res = await fetchWithRetry(
		() =>
			fetch(GRAPHQL_URL, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ query })
			}),
		'gql'
	);
	if (!res) return null;
	if (!res.ok) {
		// 429 → rate limited; 5xx → WCL outage; 401 → token rejected.
		logWcl('gql', { status: res.status });
		return null;
	}
	const json = (await res.json()) as { data?: T; errors?: GqlErrorEntry[] };
	if (json.errors && json.errors.length > 0) {
		const paths = json.errors
			.map((e) => (Array.isArray(e.path) ? e.path.join('.') : undefined))
			.filter((p): p is string => !!p);
		logWclEvent('gql-partial-errors', { count: json.errors.length, paths });
	}
	return json.data ?? null;
}

/** Escape a character name for safe inlining inside a GraphQL string literal.
 *  Newlines are collapsed to a space so they can't break out of the literal. */
export function gqlStr(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/[\r\n]+/g, ' ');
}
