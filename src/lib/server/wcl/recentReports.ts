/**
 * Recruitment screening: a character's recent reports across ANY guild (not
 * scoped to our 7 cores), so officers can sanity-check an applicant's actual
 * recent raid activity before inviting. On-demand only — no D1 caching, this
 * is a one-off lookup triggered from the admin applications page, not part of
 * any page load.
 *
 * Source: `characterData.character(name, serverSlug, serverRegion).recentReports`,
 * confirmed live against the Fresh API.
 */

import type { WclEnv, WclRecentReport } from './types';
import { SERVER_SLUG, SERVER_REGION } from './constants';
import { getToken, gql, gqlStr } from './http';
import { logWcl } from './logging';

/** Max reports to show — recent activity only, not a full history. */
const RECENT_REPORTS_LIMIT = 6;

type ReportsNode = {
	character?: {
		recentReports?: {
			data?: Array<{
				code?: string | null;
				startTime?: number | null;
				zone?: { name?: string | null } | null;
			}> | null;
		} | null;
	} | null;
} | null;

/**
 * Fetch a character's most recent reports (any guild/zone). Resilient: missing
 * creds, unknown character, or any error → empty array (never throws) — the
 * caller shows "sin actividad reciente" either way.
 */
export async function getWclCharacterRecentReports(
	env: WclEnv,
	name: string
): Promise<WclRecentReport[]> {
	try {
		const trimmed = name.trim();
		if (!trimmed) return [];

		const token = await getToken(env);
		if (!token) return [];

		const query = `query { characterData { character(name: "${gqlStr(trimmed)}", serverSlug: "${SERVER_SLUG}", serverRegion: "${SERVER_REGION}") {
			recentReports(limit: ${RECENT_REPORTS_LIMIT}) { data { code startTime zone { name } } }
		} } }`;
		const data = await gql<ReportsNode>(token, query);
		const rows = data?.character?.recentReports?.data ?? [];

		return rows
			.filter(
				(r): r is { code: string; startTime: number; zone?: { name?: string | null } | null } =>
					typeof r?.code === 'string' && typeof r?.startTime === 'number'
			)
			.map((r) => ({
				code: r.code,
				startTime: r.startTime,
				zoneName: r.zone?.name ?? null
			}));
	} catch (e) {
		logWcl('getWclCharacterRecentReports', { error: e instanceof Error ? e.message : String(e) });
		return [];
	}
}
