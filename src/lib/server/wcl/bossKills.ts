/**
 * Boss-kill progress + activity stats + recent feats, aggregated from each
 * core's recent reports (fetch + in-memory aggregation only — NO D1 here).
 *
 * This is a raw, recent-window fetch: `REPORTS_PER_GUILD` recent reports per
 * guild, any zone (Karazhan/Gruul farm nights included, since `perCoreStats`
 * and "Últimas hazañas" intentionally cover all of them). It does NOT persist
 * anything — the caller (`data.ts` + `wcl-boss-ledger.ts`) is responsible for
 * unioning this fetch's `perCore` boss names into the permanent ledger so a
 * confirmed kill can never disappear just because it ages out of this window.
 */

import type { WclEnv, WclData, WclFeat, WclCoreStats, WclSource, GuildTag } from './types';
import { REPORTS_PER_GUILD, MAX_FEATS, toIsoDate } from './constants';
import { getToken, gql } from './http';
import { defaultSources, tagToCore, resolveCore } from './core-attribution';
import { logWcl } from './logging';

type FightNode = { name: string; encounterID: number; startTime?: number; endTime?: number };
type ReportNode = {
	code: string;
	title: string;
	startTime: number;
	zone: { id: number; name: string } | null;
	/** Raid-team tag (populated on parent-guild reports; null elsewhere). */
	guildTag: GuildTag;
	fights: FightNode[];
};
type GuildReports = { reports: { data: ReportNode[] } };

/** Build the batched query: one aliased `reportData` block per guild ID. */
function buildBatchedQuery(guildIds: number[]): string {
	const blocks = guildIds
		.map(
			(id, i) => `g${i}: reportData {
    reports(guildID: ${id}, limit: ${REPORTS_PER_GUILD}) {
      data {
        code
        title
        startTime
        zone { id name }
        guildTag { id name }
        fights(killType: Kills) { name encounterID startTime endTime }
      }
    }
  }`
		)
		.join('\n  ');
	return `query {\n  ${blocks}\n}`;
}

/**
 * Fetch + aggregate live progress and feats from WCL for the given core guilds.
 *
 * @param env  Object with WCL_CLIENT_ID / WCL_CLIENT_SECRET (from platform.env).
 * @param cores Optional list of sources; defaults to the parent guild + the
 *              static teams that have a wclGuildId. Reports are attributed to a
 *              core via `resolveCore` (by tag for parent reports).
 * @returns Aggregated data, or `null` if creds are missing or anything fails.
 */
export async function getWclData(env: WclEnv, cores?: WclSource[]): Promise<WclData | null> {
	try {
		const list = cores ?? defaultSources();
		if (list.length === 0) return null;

		const token = await getToken(env);
		if (!token) return null;

		const guildIds = list.map((c) => c.wclGuildId);
		const tagMap = tagToCore();

		const data = await gql<Record<string, GuildReports>>(token, buildBatchedQuery(guildIds));
		if (!data) return null;

		const killedBossNames = new Set<string>();
		// wclGuildId → set of killed boss names for that single core.
		const perCoreSets = new Map<number, Set<string>>();
		// wclGuildId → activity stats accumulator for that core.
		const statsByCore = new Map<number, WclCoreStats>();
		// boss+core → earliest kill candidate (one feat per boss per core).
		const perBossCore = new Map<string, WclFeat>();

		list.forEach((source, i) => {
			const block = data?.[`g${i}`];
			const reports = block?.reports?.data ?? [];
			for (const report of reports) {
				// Attribute each report to its core (by tag for parent reports).
				const core = resolveCore(source, report.guildTag, tagMap);
				let coreSet = perCoreSets.get(core.wclGuildId);
				if (!coreSet) {
					coreSet = new Set<string>();
					perCoreSets.set(core.wclGuildId, coreSet);
				}
				let stats = statsByCore.get(core.wclGuildId);
				if (!stats) {
					stats = { raids: 0, totalKills: 0, lastRaid: null, fastestByBoss: {} };
					statsByCore.set(core.wclGuildId, stats);
				}
				const date = toIsoDate(report.startTime);
				// Each report is one raid night; track count + most recent date.
				stats.raids += 1;
				if (!stats.lastRaid || date > stats.lastRaid) stats.lastRaid = date;
				for (const fight of report.fights ?? []) {
					if (!fight?.name) continue;
					killedBossNames.add(fight.name);
					coreSet.add(fight.name);
					stats.totalKills += 1;
					// Fastest clear of this boss for the core (fight duration in ms).
					if (typeof fight.startTime === 'number' && typeof fight.endTime === 'number') {
						const dur = fight.endTime - fight.startTime;
						if (dur > 0) {
							const prev = stats.fastestByBoss[fight.name];
							if (prev == null || dur < prev) stats.fastestByBoss[fight.name] = dur;
						}
					}

					const key = `${fight.name}::${core.name}`;
					const existing = perBossCore.get(key);
					// Keep the EARLIEST date for this boss+core (first kill for the core).
					if (!existing || date < existing.date) {
						perBossCore.set(key, {
							boss: fight.name,
							date,
							team: core.name,
							encounterID: fight.encounterID,
							firstKill: false
						});
					}
				}
			}
		});

		const feats = [...perBossCore.values()];

		// Mark firstKill on the earliest occurrence of each boss across ALL cores.
		const earliestByBoss = new Map<string, WclFeat>();
		for (const f of feats) {
			const cur = earliestByBoss.get(f.boss);
			if (!cur || f.date < cur.date) earliestByBoss.set(f.boss, f);
		}
		for (const f of earliestByBoss.values()) f.firstKill = true;

		// Most recent first, then take the top N.
		feats.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

		const perCore: Record<number, string[]> = {};
		for (const [id, set] of perCoreSets) perCore[id] = [...set];

		const perCoreStats: Record<number, WclCoreStats> = {};
		for (const [id, s] of statsByCore) perCoreStats[id] = s;

		return { killedBossNames, perCore, perCoreStats, feats: feats.slice(0, MAX_FEATS) };
	} catch (e) {
		logWcl('getWclData', { error: e instanceof Error ? e.message : String(e) });
		return null;
	}
}
