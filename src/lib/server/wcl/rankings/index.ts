/**
 * Report-rankings aggregate powering the Hall of Fame, per-core rosters, the
 * per-class / per-boss leaderboards and the player-detail histórico.
 *
 * Source: `reportData.report(code).rankings`. That JSON scalar is an array of
 * fights, each with `roles.{tanks,healers,dps}.characters[]`. Every character
 * carries `name`, `class` (English class string), `spec` and `rankPercent`
 * (the 0–100 parse). Characters are already bucketed by role, so no spec→role
 * guessing is needed. We aggregate the BEST rankPercent per character per role
 * across the recent reports of all cores, then take the top N per role.
 *
 * Roster/role/class/core are discovered from report rankings — what each
 * player ACTUALLY played, far more reliable in Fresh TBC than
 * `zoneRankings.bestSpec`. The SCORE, however, is the player's
 * `zoneRankings.bestPerformanceAverage` (fetched per roster name), so the Hall
 * of Fame / rosters / per-class boards rank by the SAME number the
 * /jugador/NAME page shows — everything stays coherent. Report-parse scores
 * are the fallback when a name has no zoneRankings.
 *
 * Orchestrates three phases — report codes per core → report rankings
 * (chunked) → roster zone scores (chunked) — feeding a shared accumulator.
 * Fully resilient: returns null on any failure or if empty.
 */

import type { WclEnv, WclSource, WclRankings, GuildTag } from '../types';
import { SSC_TK_ZONE_ID, HOF_REPORTS_PER_CORE, ZONE_SCORE_CHUNK, toIsoDate } from '../constants';
import { getToken, gql, gqlStr } from '../http';
import { defaultSources, tagToCore, resolveCore } from '../core-attribution';
import { buildCharacterQuery, toWclCharacter, type CharacterNode } from '../characterLookup';
import { createRankingsAccumulator, type RankChar } from './accumulator';
import { logWcl } from '../logging';

type RankFight = {
	/** Per-fight encounter (the boss) — used to build the per-player histórico. */
	encounter?: { id?: number | null; name?: string | null } | null;
	/** 1 when this fight is a kill. */
	kill?: number | null;
	roles?: {
		tanks?: { characters?: RankChar[] | null } | null;
		healers?: { characters?: RankChar[] | null } | null;
		dps?: { characters?: RankChar[] | null } | null;
	} | null;
};
/** The `rankings` JSON scalar is an object wrapping the fights in `data`. */
type ReportRankings = { data?: RankFight[] | null } | null;

/** Batched query: recent report codes (+ owning tag) per core (1 request). */
function buildReportCodesQuery(guildIds: number[]): string {
	const blocks = guildIds
		.map(
			(id, i) => `r${i}: reportData {
    reports(guildID: ${id}, limit: ${HOF_REPORTS_PER_CORE}, zoneID: ${SSC_TK_ZONE_ID}) {
      data { code guildTag { id name } }
    }
  }`
		)
		.join('\n  ');
	return `query {\n  ${blocks}\n}`;
}

/**
 * Batched query: `rankings` JSON + `startTime` for several report codes (1
 * request). `startTime` lets us date each fight for the per-player histórico;
 * the per-fight boss lives inside the `rankings` JSON scalar (each fight's
 * `encounter.name`).
 */
function buildReportRankingsQuery(codes: string[]): string {
	const blocks = codes
		.map(
			(code, i) => `q${i}: reportData {
    report(code: "${gqlStr(code)}") { startTime rankings }
  }`
		)
		.join('\n  ');
	return `query {\n  ${blocks}\n}`;
}

type ReportCodeMaps = {
	/** report code → core display name. */
	codeToCore: Map<string, string>;
	/** report code → core wclGuildId (for per-core rosters). */
	codeToGuildId: Map<string, number>;
};

/**
 * Phase 1 of {@link getWclRankings}: fetch the recent report codes per core in a
 * single batched query and attribute each parent report to the right core by its
 * raid-team tag. Returns null when the query fails.
 */
async function fetchReportCodes(token: string, list: WclSource[]): Promise<ReportCodeMaps | null> {
	const guildIds = list.map((c) => c.wclGuildId);
	const tagMap = tagToCore();
	type ReportCodes = { reports: { data: { code: string; guildTag: GuildTag }[] } };
	const codesData = await gql<Record<string, ReportCodes>>(token, buildReportCodesQuery(guildIds));
	if (!codesData) return null;

	const codeToCore = new Map<string, string>();
	const codeToGuildId = new Map<string, number>();
	list.forEach((source, i) => {
		for (const r of codesData[`r${i}`]?.reports?.data ?? []) {
			if (r?.code && !codeToCore.has(r.code)) {
				const core = resolveCore(source, r.guildTag, tagMap);
				codeToCore.set(r.code, core.name);
				codeToGuildId.set(r.code, core.wclGuildId);
			}
		}
	});
	return { codeToCore, codeToGuildId };
}

/**
 * Fetch each roster name's `zoneRankings.bestPerformanceAverage` — the SAME
 * metric the /jugador/NAME detail page shows as its headline. Batched in chunks
 * (the scalar is expensive) and resilient: a failed chunk or unresolved name
 * just yields no entry, so callers fall back to the report-parse score. Returns
 * name(lowercased) → rounded score.
 */
async function fetchZoneScores(token: string, names: string[]): Promise<Map<string, number>> {
	const out = new Map<string, number>();
	for (let i = 0; i < names.length; i += ZONE_SCORE_CHUNK) {
		const chunk = names.slice(i, i + ZONE_SCORE_CHUNK);
		const data = await gql<Record<string, { character: CharacterNode }>>(
			token,
			buildCharacterQuery(chunk)
		);
		if (!data) continue; // Skip a failed chunk; keep what we have.
		chunk.forEach((name, j) => {
			const node = data[`c${j}`]?.character ?? null;
			if (!node) return;
			const ch = toWclCharacter(name, node);
			if (typeof ch.score === 'number') out.set(name.toLowerCase(), ch.score);
		});
	}
	return out;
}

export async function getWclRankings(
	env: WclEnv,
	cores?: WclSource[]
): Promise<WclRankings | null> {
	try {
		const list = cores ?? defaultSources();
		if (list.length === 0) return null;

		const token = await getToken(env);
		if (!token) return null;

		// Phase 1 — recent report codes per core (single batched query).
		const codes = await fetchReportCodes(token, list);
		if (!codes) return null;
		const { codeToCore, codeToGuildId } = codes;
		const allCodes = [...codeToCore.keys()];
		if (allCodes.length === 0) return null;

		const acc = createRankingsAccumulator();

		// Phase 2 — report rankings, batched in chunks of report codes.
		const CHUNK = 4;
		for (let start = 0; start < allCodes.length; start += CHUNK) {
			const chunk = allCodes.slice(start, start + CHUNK);
			const data = await gql<
				Record<string, { report: { startTime?: number | null; rankings: ReportRankings } | null }>
			>(token, buildReportRankingsQuery(chunk));
			if (!data) continue; // Skip a failed chunk; keep what we have.

			chunk.forEach((code, i) => {
				const report = data[`q${i}`]?.report;
				const fights = report?.rankings?.data ?? [];
				const core = codeToCore.get(code) ?? 'Core';
				const guildId = codeToGuildId.get(code);
				// Date for this report's kills (for the histórico). May be missing.
				const date = typeof report?.startTime === 'number' ? toIsoDate(report.startTime) : null;
				for (const fight of fights) {
					const roles = fight?.roles;
					if (!roles) continue;
					const boss = fight?.encounter?.name ?? null;
					for (const c of roles.tanks?.characters ?? []) {
						acc.consider(c, 'Tank', core, guildId);
						if (boss) acc.considerBoss(c, boss, core);
						if (boss && date) acc.recordKill(c, boss, date, core);
					}
					for (const c of roles.healers?.characters ?? []) {
						acc.consider(c, 'Healer', core, guildId);
						if (boss) acc.considerBoss(c, boss, core);
						if (boss && date) acc.recordKill(c, boss, date, core);
					}
					for (const c of roles.dps?.characters ?? []) {
						acc.consider(c, 'DPS', core, guildId);
						if (boss) acc.considerBoss(c, boss, core);
						if (boss && date) acc.recordKill(c, boss, date, core);
					}
				}
			});
		}

		// Phase 3 — coherent scores: one fetch per ~20 names, riding this 12h cache.
		const zoneScores = await fetchZoneScores(token, acc.characterNames());
		return acc.build(zoneScores);
	} catch (e) {
		logWcl('getWclRankings', { error: e instanceof Error ? e.message : String(e) });
		return null;
	}
}
