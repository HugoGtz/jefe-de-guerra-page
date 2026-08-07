/**
 * Live API quota check (`rateLimitData`), for the admin "Estado de WarcraftLogs"
 * page. Confirmed live against the Fresh API: top-level `rateLimitData` field,
 * no args. Deliberately NOT D1-cached — it's meant to show the CURRENT quota
 * state, and the query itself is a single trivial field (no chunking, no real
 * cost), unlike every other fetch in this module.
 */

import type { WclEnv, WclRateLimit } from './types';
import { getToken, gql } from './http';
import { logWcl } from './logging';

type RateLimitNode = { rateLimitData?: WclRateLimit | null } | null;

/** Fetch the current hourly API point usage. Resilient: missing creds / any
 *  error → null. */
export async function getWclRateLimit(env: WclEnv): Promise<WclRateLimit | null> {
	try {
		const token = await getToken(env);
		if (!token) return null;

		const data = await gql<RateLimitNode>(
			token,
			`query { rateLimitData { limitPerHour pointsSpentThisHour pointsResetIn } }`
		);
		return data?.rateLimitData ?? null;
	} catch (e) {
		logWcl('getWclRateLimit', { error: e instanceof Error ? e.message : String(e) });
		return null;
	}
}
