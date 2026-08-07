/**
 * Shared per-character lookup: the batched `characterData.character(...)`
 * query (name + classID + a lightweight zoneRankings summary) used by both
 * `officers.ts` (enrich officers) and `rankings/index.ts`'s `fetchZoneScores`
 * (coherent Hall-of-Fame/roster scores) — previously duplicated by proximity
 * across the file, now one implementation.
 */

import type { SpecRole } from '$lib/data/officers';
import type { WclCharacter } from './types';
import {
	CLASS_ID_TO_CLASS,
	CLASS_LABEL_ES,
	SSC_TK_ZONE_ID,
	WCL_PARTITION,
	SERVER_SLUG,
	SERVER_REGION,
	roleForSpec
} from './constants';
import { gqlStr } from './http';

/**
 * The `zoneRankings` field is a JSON scalar. We only read a couple of fields;
 * everything is optional/defensive since WCL may omit them when a character has
 * no logged parses.
 */
type ZoneRankings = {
	bestPerformanceAverage?: number | null;
	metric?: string | null;
	rankings?: Array<{
		spec?: string | null;
		bestSpec?: string | null;
		rankPercent?: number | null;
	}> | null;
};

export type CharacterNode = {
	name?: string | null;
	classID?: number | null;
	zoneRankings?: ZoneRankings | null;
} | null;

/**
 * Pick the dominant spec (and its role) for a character from its zoneRankings.
 * Uses the most-common bestSpec across ranked encounters; falls back to the
 * first available. Returns undefined spec when nothing is logged.
 */
function pickSpec(zr: ZoneRankings | null | undefined): {
	spec?: string;
	specRole?: SpecRole;
} {
	const rankings = zr?.rankings ?? [];
	const counts = new Map<string, number>();
	for (const r of rankings) {
		const s = r?.bestSpec ?? r?.spec;
		if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
	}
	let best: string | undefined;
	let bestCount = -1;
	for (const [s, c] of counts) {
		if (c > bestCount) {
			best = s;
			bestCount = c;
		}
	}
	if (!best) return {};
	return { spec: best, specRole: roleForSpec(best) };
}

/**
 * Derive a role from the ranking metric: `hps` → Healer, anything else → DPS.
 * Used as a fallback / corrective signal alongside the spec name (the metric is
 * more reliable than fresh-TBC spec labels, which can be noisy).
 */
function roleForMetric(metric: string | null | undefined): SpecRole | null {
	if (!metric) return null;
	return metric.toLowerCase() === 'hps' ? 'Healer' : null;
}

/** Map a classID + zoneRankings into our WclCharacter shape. */
export function toWclCharacter(name: string, node: CharacterNode): WclCharacter {
	const out: WclCharacter = { name };
	const classId = node?.classID ?? null;
	if (classId != null && CLASS_ID_TO_CLASS[classId]) {
		out.wowClass = CLASS_ID_TO_CLASS[classId];
		out.classLabel = CLASS_LABEL_ES[out.wowClass];
	}
	const { spec, specRole } = pickSpec(node?.zoneRankings);
	if (spec) {
		out.spec = spec;
		// Prefer a healer metric over an ambiguous spec name; otherwise trust spec.
		out.specRole = roleForMetric(node?.zoneRankings?.metric) ?? specRole;
	} else {
		const metricRole = roleForMetric(node?.zoneRankings?.metric);
		if (metricRole) out.specRole = metricRole;
	}
	const avg = node?.zoneRankings?.bestPerformanceAverage;
	if (typeof avg === 'number' && avg > 0) {
		out.score = Math.round(avg);
	}
	return out;
}

/**
 * Build one batched query fetching characterData for many names via aliases.
 * Each alias resolves a character + its SSC/TK zoneRankings.
 */
export function buildCharacterQuery(names: string[]): string {
	const blocks = names
		.map(
			(name, i) => `c${i}: characterData {
    character(name: "${gqlStr(name)}", serverSlug: "${SERVER_SLUG}", serverRegion: "${SERVER_REGION}") {
      name
      classID
      zoneRankings(zoneID: ${SSC_TK_ZONE_ID}, partition: ${WCL_PARTITION})
    }
  }`
		)
		.join('\n  ');
	return `query {\n  ${blocks}\n}`;
}
