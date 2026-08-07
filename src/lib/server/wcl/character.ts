/**
 * Per-character detail (internal player page).
 *
 * Source: ONE `characterData.character(...).zoneRankings(zoneID:1056)` query.
 * The JSON scalar carries `bestPerformanceAverage`, `medianPerformanceAverage`,
 * `metric`, an `allStars[]` array (per-spec points + world/region/server ranks)
 * and a `rankings[]` array (one per SSC/TK boss). All fields are defensive: WCL
 * returns `"-"` strings for unranked numbers and may omit/null anything, so we
 * coerce carefully and never throw.
 */

import type { WclEnv, WclCharacterDetail, WclAllStarsEntry, WclBossDetail } from './types';
import {
	CLASS_ID_TO_CLASS,
	CLASS_LABEL_ES,
	CLASS_COLOR,
	SSC_TK_ZONE_ID,
	WCL_PARTITION,
	SERVER_SLUG,
	SERVER_REGION,
	roleForSpec
} from './constants';
import { getToken, gql, gqlStr } from './http';
import { logWcl } from './logging';

/** Coerce a WCL rank value (number, numeric string, or "-") to a number|null. */
function toRankNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
	if (typeof value === 'string') {
		const n = Number(value.replace(/[^\d.-]/g, ''));
		return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
	}
	return null;
}

/** Round a finite number, else null. */
function roundOrNull(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}

/** Round a finite number, else 0 (for averages that should display as a value). */
function roundOrZero(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0;
}

/** A single all-stars entry as it appears in the zoneRankings JSON scalar. */
type AllStarsNode = {
	spec?: string | null;
	points?: number | null;
	possiblePoints?: number | null;
	rank?: number | string | null;
	regionRank?: number | string | null;
	serverRank?: number | string | null;
	rankPercent?: number | string | null;
};
/** A single boss ranking as it appears in the zoneRankings JSON scalar. */
type RankingNode = {
	encounter?: { id?: number | null; name?: string | null } | null;
	rankPercent?: number | null;
	medianPercent?: number | null;
	totalKills?: number | null;
	fastestKill?: number | null;
	bestAmount?: number | null;
	spec?: string | null;
	bestSpec?: string | null;
	bestRank?: { ilvl?: number | null } | null;
};
/** Full zoneRankings JSON scalar shape used by the player-detail page. */
type ZoneRankingsFull = {
	bestPerformanceAverage?: number | null;
	medianPerformanceAverage?: number | null;
	metric?: string | null;
	allStars?: AllStarsNode[] | null;
	rankings?: RankingNode[] | null;
};
type CharacterDetailNode = {
	name?: string | null;
	classID?: number | null;
	zoneRankings?: ZoneRankingsFull | null;
} | null;

/** Build the single-character query for the detail page. */
function buildCharacterDetailQuery(name: string): string {
	return `query {
  characterData {
    character(name: "${gqlStr(name)}", serverSlug: "${SERVER_SLUG}", serverRegion: "${SERVER_REGION}") {
      name
      classID
      zoneRankings(zoneID: ${SSC_TK_ZONE_ID}, partition: ${WCL_PARTITION})
    }
  }
}`;
}

/**
 * Pick the dominant spec for the detail header: the all-stars spec with the most
 * points; falling back to the most-common spec across boss rankings. Returns
 * null when nothing is logged.
 */
function pickMainSpec(zr: ZoneRankingsFull): string | null {
	const allStars = zr.allStars ?? [];
	let best: string | null = null;
	let bestPoints = -1;
	for (const a of allStars) {
		const pts = typeof a.points === 'number' ? a.points : -1;
		if (a.spec && pts > bestPoints) {
			best = a.spec;
			bestPoints = pts;
		}
	}
	if (best) return best;
	// Fallback: most-common (best)spec across boss rankings.
	const counts = new Map<string, number>();
	for (const r of zr.rankings ?? []) {
		const s = r.bestSpec ?? r.spec;
		if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
	}
	let common: string | null = null;
	let commonCount = -1;
	for (const [s, c] of counts) {
		if (c > commonCount) {
			common = s;
			commonCount = c;
		}
	}
	return common;
}

/**
 * Fetch + shape ONE character's SSC/TK detail for the internal player page.
 *
 * Single GraphQL query. Resilient: missing creds, an unresolved character, no
 * logged parses, or any error all yield `null` (the page renders a friendly
 * empty state). Never throws.
 */
export async function getWclCharacter(
	env: WclEnv,
	name: string
): Promise<WclCharacterDetail | null> {
	try {
		if (!name.trim()) return null;
		const token = await getToken(env);
		if (!token) return null;

		const data = await gql<{ characterData?: { character?: CharacterDetailNode } }>(
			token,
			buildCharacterDetailQuery(name)
		);
		const node = data?.characterData?.character ?? null;
		const zr = node?.zoneRankings ?? null;
		// No rankings at all → treat as "no logs" (empty state).
		if (!node || !zr) return null;

		const hasAllStars = (zr.allStars?.length ?? 0) > 0;
		const hasRankings = (zr.rankings ?? []).some((r) => (r.totalKills ?? 0) > 0);
		if (!hasAllStars && !hasRankings) return null;

		const classId = node.classID ?? null;
		const wowClass = classId != null ? (CLASS_ID_TO_CLASS[classId] ?? null) : null;
		const classLabel = wowClass ? CLASS_LABEL_ES[wowClass] : null;
		const classColor = wowClass ? CLASS_COLOR[wowClass] : null;

		const mainSpec = pickMainSpec(zr);
		const role = roleForSpec(mainSpec);

		// All-stars per spec, sorted by points desc.
		const allStars: WclAllStarsEntry[] = (zr.allStars ?? [])
			.filter((a): a is AllStarsNode & { spec: string } => !!a?.spec)
			.map((a) => ({
				spec: a.spec,
				points: roundOrZero(a.points),
				possiblePoints: roundOrZero(a.possiblePoints),
				world: toRankNumber(a.rank),
				region: toRankNumber(a.regionRank),
				server: toRankNumber(a.serverRank),
				rankPercent:
					typeof a.rankPercent === 'number' && Number.isFinite(a.rankPercent)
						? Math.round(a.rankPercent)
						: null
			}))
			.sort((a, b) => b.points - a.points);

		// Best ranks come from the top all-stars spec (highest points).
		const topAllStars = allStars[0];
		const bestRanks = {
			world: topAllStars?.world ?? null,
			region: topAllStars?.region ?? null,
			server: topAllStars?.server ?? null
		};

		// Per-boss rows. Keep only bosses with a parse or a kill; sort by best % desc,
		// then by kills desc, so the strongest content surfaces first.
		const bosses: WclBossDetail[] = (zr.rankings ?? [])
			.map((r) => ({
				encounterName: r.encounter?.name ?? 'Desconocido',
				best: roundOrNull(r.rankPercent),
				median: roundOrNull(r.medianPercent),
				kills: typeof r.totalKills === 'number' ? r.totalKills : 0,
				amount: roundOrNull(r.bestAmount),
				ilvl: typeof r.bestRank?.ilvl === 'number' ? r.bestRank.ilvl : null,
				fastestKillMs:
					typeof r.fastestKill === 'number' && r.fastestKill > 0 ? r.fastestKill : null,
				spec: r.bestSpec ?? r.spec ?? null
			}))
			.filter((b) => b.kills > 0 || b.best != null)
			.sort((a, b) => (b.best ?? -1) - (a.best ?? -1) || b.kills - a.kills);

		return {
			name: node.name?.trim() || name,
			wowClass,
			classLabel,
			classColor,
			mainSpec,
			role,
			metric: zr.metric ?? null,
			bestAvg: roundOrZero(zr.bestPerformanceAverage),
			median: roundOrZero(zr.medianPerformanceAverage),
			bestRanks,
			allStars,
			bosses
		};
	} catch (e) {
		logWcl('getWclCharacter', { error: e instanceof Error ? e.message : String(e) });
		return null;
	}
}
