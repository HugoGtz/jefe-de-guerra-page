/**
 * WarcraftLogs API integration (server-only).
 *
 * Derives the guild's live raid progress and recent feats from the WCL logs of
 * the 7 Cores (parent guild "Jefe de Guerra", Fresh/Anniversary Classic).
 *
 * Flow:
 *  1. OAuth client-credentials → bearer token (cached at module level w/ expiry).
 *  2. One batched GraphQL query across all 7 core guild IDs (GraphQL aliases).
 *  3. Aggregate killed boss names (union across cores) + build deduped feats.
 *
 * Everything is resilient: missing creds or any error → returns `null` so the
 * caller falls back to the manual D1/static data. No top-level side effects;
 * all network/Date use happens inside the functions (SSR runtime only).
 */

import { teams as staticTeams } from '$lib/data/teams';
import { officers as staticOfficers } from '$lib/data/officers';
import type { WowClass, SpecRole } from '$lib/data/officers';

/** Re-export so the WCL layer can offer it too; the impl lives in the shared
    (non-server) parse module so components can import it directly. */
export { formatDuration } from '$lib/parse';

const OAUTH_URL = 'https://www.warcraftlogs.com/oauth/token';
const GRAPHQL_URL = 'https://fresh.warcraftlogs.com/api/v2/client';

/** Reports fetched per guild per query. */
const REPORTS_PER_GUILD = 25;
/** Max feats returned (most recent first-kills/kills). */
const MAX_FEATS = 10;
/** SSC/TK zone used for all character rankings. */
const SSC_TK_ZONE_ID = 1056;
/**
 * Partition for character zoneRankings. SSC/TK (1056) has P1 (id 1) and P2
 * (id 2, the WCL default). `-1` aggregates ALL partitions so a character's
 * best parse is captured regardless of the Fresh phase it happened in (the
 * default would silently show only the latest partition). Set to a specific
 * id to scope to one phase.
 */
const WCL_PARTITION = -1;
/** Server slug / region for every character lookup. */
const SERVER_SLUG = 'dreamscythe';
const SERVER_REGION = 'us';
/** Top N per role surfaced in the Hall of Fame. */
const HOF_TOP_N = 10;

/**
 * The guild's logs are FRAGMENTED across two WCL representations:
 *  - Most cores upload to their OWN guild object (`wclGuildId`, e.g. 826903).
 *  - Some cores (e.g. Core 4) instead upload to the PARENT guild "Jefe de Guerra"
 *    (792187) under their raid-team TAG (`wclTagId`); their own guild object is
 *    then empty.
 * No single source holds everything, so the global queries pull the parent PLUS
 * every core guild object, and attribute each report to its core via `resolveCore`
 * (by source for core guilds; by `guildTag` for parent reports). This is what lets
 * a parent report tagged "Core 4" land in the Core 4 bucket instead of "General".
 */
type WclSource = { wclGuildId: number; name: string; isParent?: boolean };

const PARENT_GUILD: WclSource = { wclGuildId: 792187, name: 'General', isParent: true };

/** Default aggregate sources for the global queries: parent + every core. */
function defaultSources(): WclSource[] {
	const cores = staticTeams
		.filter((t): t is typeof t & { wclGuildId: number } => typeof t.wclGuildId === 'number')
		.map((t) => ({ wclGuildId: t.wclGuildId, name: t.name }));
	return [PARENT_GUILD, ...cores];
}

/**
 * tagID → core, for cores whose raids are logged on the PARENT guild under a
 * raid-team tag rather than their own guild object. Built from the static teams'
 * `wclTagId`. Lets a parent report be bucketed into the right core.
 */
function tagToCore(): Map<number, { wclGuildId: number; name: string }> {
	const m = new Map<number, { wclGuildId: number; name: string }>();
	for (const t of staticTeams) {
		if (typeof t.wclTagId === 'number' && typeof t.wclGuildId === 'number') {
			m.set(t.wclTagId, { wclGuildId: t.wclGuildId, name: t.name });
		}
	}
	return m;
}

/** A report's owning raid-team tag (only populated on the parent guild's reports). */
type GuildTag = { id?: number | null; name?: string | null } | null;

/**
 * Resolve which core a report belongs to. Reports from a core's own guild object
 * map straight to that core; reports from the PARENT are attributed by their
 * raid-team tag (falling back to the parent's "General" bucket when untagged or
 * tagged with an unknown team).
 */
function resolveCore(
	source: WclSource,
	guildTag: GuildTag,
	tagMap: Map<number, { wclGuildId: number; name: string }>
): { wclGuildId: number; name: string } {
	if (!source.isParent) return { wclGuildId: source.wclGuildId, name: source.name };
	const tagId = guildTag?.id ?? null;
	if (tagId != null) {
		const core = tagMap.get(tagId);
		if (core) return core;
	}
	return { wclGuildId: source.wclGuildId, name: source.name };
}

// ── TBC class IDs → English class + Spanish label ────────────────────────────

/** WCL/Blizzard classID → our internal WowClass (TBC class set). */
const CLASS_ID_TO_CLASS: Record<number, WowClass> = {
	1: 'Warrior',
	2: 'Paladin',
	3: 'Hunter',
	4: 'Rogue',
	5: 'Priest',
	7: 'Shaman',
	8: 'Mage',
	9: 'Warlock',
	11: 'Druid'
};

/** English WowClass → Spanish display label. */
const CLASS_LABEL_ES: Record<WowClass, string> = {
	Warrior: 'Guerrero',
	Paladin: 'Paladín',
	Hunter: 'Cazador',
	Rogue: 'Pícaro',
	Priest: 'Sacerdote',
	Shaman: 'Chamán',
	Mage: 'Mago',
	Warlock: 'Brujo',
	Druid: 'Druida'
};

/** Class → hex color (standard WoW class colors) for UI accents. */
export const CLASS_COLOR: Record<WowClass, string> = {
	Warrior: '#C79C6E',
	Paladin: '#F58CBA',
	Hunter: '#ABD473',
	Rogue: '#FFF569',
	Priest: '#FFFFFF',
	Shaman: '#0070DE',
	Mage: '#69CCF0',
	Warlock: '#9482C9',
	Druid: '#FF7D0A'
};

/**
 * Spec name (WCL `bestSpec`/`spec`, English) → combat role. Covers every TBC
 * spec that is a tank or healer; anything not listed defaults to DPS.
 */
const SPEC_TO_ROLE: Record<string, SpecRole> = {
	// Tanks
	Protection: 'Tank', // Warrior / Paladin protection
	Guardian: 'Tank', // Feral-bear (some datasets label it Guardian)
	Blood: 'Tank',
	// Healers
	Holy: 'Healer', // Priest / Paladin holy
	Discipline: 'Healer',
	Restoration: 'Healer', // Shaman / Druid resto
	Mistweaver: 'Healer'
};

/**
 * Resolve a combat role from a spec name + class. Most specs are DPS; the few
 * tank/healer specs are handled by SPEC_TO_ROLE, with a couple of
 * class-sensitive exceptions (e.g. a "Feral" druid that tanks isn't reliably
 * distinguishable from a DPS cat by name alone, so it stays DPS).
 */
function roleForSpec(spec: string | null | undefined): SpecRole {
	if (!spec) return 'DPS';
	return SPEC_TO_ROLE[spec] ?? 'DPS';
}

export function classLabelEs(wowClass: WowClass): string {
	return CLASS_LABEL_ES[wowClass];
}

// ── Character-level shapes (officer enrichment + Hall of Fame) ───────────────

/** A single character's WCL-derived class/spec/score. */
export type WclCharacter = {
	name: string;
	wowClass?: WowClass;
	classLabel?: string;
	spec?: string;
	specRole?: SpecRole;
	/** Rounded bestPerformanceAverage (0–100), if WCL had rankings. */
	score?: number;
};

/** A single all-stars entry (per spec) for the player-detail page. */
export type WclAllStarsEntry = {
	/** Spec name (English, as WCL reports it). */
	spec: string;
	/** Rounded all-stars points earned this partition. */
	points: number;
	/** Rounded maximum possible all-stars points. */
	possiblePoints: number;
	/** World rank for this spec, or null when unranked. */
	world: number | null;
	/** Region rank for this spec, or null when unranked. */
	region: number | null;
	/** Server rank for this spec, or null when unranked. */
	server: number | null;
	/** Rounded all-stars percentile (0–100), or null when unranked. */
	rankPercent: number | null;
};

/** A single SSC/TK boss row for the player-detail page. */
export type WclBossDetail = {
	/** Boss/encounter name (English). */
	encounterName: string;
	/** Rounded best rankPercent (0–100), or null when no parse. */
	best: number | null;
	/** Rounded median rankPercent (0–100), or null when no parse. */
	median: number | null;
	/** Total kills logged for this boss. */
	kills: number;
	/** Rounded best amount (DPS/HPS per second), or null. */
	amount: number | null;
	/** Item level of the best parse, or null. */
	ilvl: number | null;
	/** Fastest kill duration in milliseconds, or null when none. */
	fastestKillMs: number | null;
	/** Spec played on the best parse, or null. */
	spec: string | null;
};

/**
 * Full per-character detail for the internal player page. Built from ONE
 * `characterData.character` query (SSC/TK zoneRankings). Every field is
 * defensive; the whole thing is `null` when the character has no logs.
 */
export type WclCharacterDetail = {
	/** Canonical name as WCL returned it (falls back to the requested name). */
	name: string;
	/** Internal WowClass (from classID), or null when unknown. */
	wowClass: WowClass | null;
	/** Spanish class label, or null. */
	classLabel: string | null;
	/** Hex class color, or null. */
	classColor: string | null;
	/** Dominant spec (top all-stars spec, else most-common ranking spec), or null. */
	mainSpec: string | null;
	/** Combat role derived from mainSpec. */
	role: SpecRole;
	/** Ranking metric ('dps' | 'hps' | …), or null. */
	metric: string | null;
	/** Rounded best performance average (0–100). */
	bestAvg: number;
	/** Rounded median performance average (0–100). */
	median: number;
	/** Best ranks from the top all-stars spec (null when unranked). */
	bestRanks: { world: number | null; region: number | null; server: number | null };
	/** Per-spec all-stars breakdown (sorted by points desc). */
	allStars: WclAllStarsEntry[];
	/** Per-boss SSC/TK breakdown (sorted by best % desc, then by kills). */
	bosses: WclBossDetail[];
};

/** One Hall-of-Fame entry (best parse for a character in a given role). */
export type HallOfFameEntry = {
	name: string;
	wowClass?: WowClass;
	classLabel?: string;
	classColor?: string;
	spec?: string;
	role: SpecRole;
	/** Core/guild display name where the character was found. */
	core: string;
	score: number;
};

export type HallOfFame = {
	dps: HallOfFameEntry[];
	healers: HallOfFameEntry[];
	tanks: HallOfFameEntry[];
};

/**
 * Combined result of the single report-rankings fetch: the Hall of Fame (top N
 * per role) AND a per-character map (name(lower) → best parse + the class/spec/
 * role they actually played). Both are derived from the SAME report rankings, so
 * one cache feeds both the HoF and reliable officer enrichment.
 */
export type WclRankings = {
	hallOfFame: HallOfFame;
	/** name(lowercased) → reliable class/spec/role/score from report rankings. */
	characters: Record<string, WclCharacter>;
	/**
	 * Per-core roster keyed by wclGuildId → that core's characters (best parse per
	 * character within the core), sorted by score descending. Derived from the SAME
	 * report rankings — no extra network requests. May be empty for cores with no
	 * ranked characters.
	 */
	rosters: Record<number, WclCharacter[]>;
	/**
	 * Per-player recent-kills history, keyed by name(lowercased) → newest-first list
	 * of kills (boss · date · parse · core). Derived from the SAME report rankings
	 * (each fight's encounter + the report's startTime), so it rides this cache with
	 * NO extra network requests. Optional: stale cache rows lacking it → empty
	 * histórico (additive, never crashes).
	 */
	recentByPlayer?: Record<string, WclRecentKill[]>;
	/**
	 * Best-parse leaderboard per class: WowClass → top characters by score (desc).
	 * Derived from the same `characters` map — NO extra network requests. Optional:
	 * stale cache rows lacking it → treated as absent.
	 */
	byClass?: Record<string, WclCharacter[]>;
	/**
	 * Best-parse leaderboard per boss: encounter name → top entries by parse (desc).
	 * One best parse per character per boss, from the same report rankings. Optional.
	 */
	byBoss?: Record<string, BossLeaderEntry[]>;
};

/** One per-boss leaderboard entry (best parse for a character on that boss). */
export type BossLeaderEntry = {
	name: string;
	wowClass?: WowClass;
	classLabel?: string;
	classColor?: string;
	spec?: string;
	/** Core/guild display name where the parse happened. */
	core: string;
	/** Rounded rankPercent (0–100). */
	score: number;
};

/** A single recent kill for the player-detail "histórico" section. */
export type WclRecentKill = {
	/** Boss/encounter name (English). */
	boss: string;
	/** ISO 'yyyy-mm-dd' derived from the report startTime. */
	date: string;
	/** Rounded rankPercent (0–100) for that fight, or null when none. */
	parse: number | null;
	/** Core/guild display name where the kill happened. */
	core: string;
};

export type WclFeat = {
	boss: string;
	/** ISO 'yyyy-mm-dd' derived from the report startTime. */
	date: string;
	/** Display name of the core that got the kill (e.g. "Core 1"). */
	team: string;
	encounterID: number;
	/** True for the earliest occurrence of this boss across ALL cores. */
	firstKill: boolean;
};

/** Cheap per-core activity stats, derived from the SAME reports as `getWclData`. */
export type WclCoreStats = {
	/** Distinct reports (raid nights) logged for this core. */
	raids: number;
	/** Total boss kills logged across those reports. */
	totalKills: number;
	/** ISO 'yyyy-mm-dd' of the most recent report, or null. */
	lastRaid: string | null;
	/** Fastest kill per boss: boss name → fastest clear duration in ms. */
	fastestByBoss: Record<string, number>;
};

export type WclData = {
	/** Union of every boss name killed across all cores. */
	killedBossNames: Set<string>;
	/** Per-core (wclGuildId → killed boss names) so each Core card shows ITS progress. */
	perCore: Record<number, string[]>;
	/**
	 * Per-core (wclGuildId → activity stats) from the same reports — NO extra
	 * network cost. Optional: stale cache rows lacking it → treated as absent.
	 */
	perCoreStats?: Record<number, WclCoreStats>;
	feats: WclFeat[];
};

type WclEnv = {
	WCL_CLIENT_ID?: string;
	WCL_CLIENT_SECRET?: string;
};

// ── OAuth token cache (module-level) ─────────────────────────────────────────

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(env: WclEnv): Promise<string | null> {
	const { WCL_CLIENT_ID, WCL_CLIENT_SECRET } = env;
	if (!WCL_CLIENT_ID || !WCL_CLIENT_SECRET) return null;

	// Reuse the cached token until ~60s before it expires.
	if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
		return cachedToken.value;
	}

	const basic = btoa(`${WCL_CLIENT_ID}:${WCL_CLIENT_SECRET}`);
	const res = await fetch(OAUTH_URL, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${basic}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: 'grant_type=client_credentials'
	});
	if (!res.ok) return null;

	const json = (await res.json()) as { access_token?: string; expires_in?: number };
	if (!json.access_token) return null;

	const ttlMs = (json.expires_in ?? 3600) * 1000;
	cachedToken = { value: json.access_token, expiresAt: Date.now() + ttlMs };
	return cachedToken.value;
}

// ── GraphQL query shape ──────────────────────────────────────────────────────

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

function toIsoDate(epochMs: number): string {
	return new Date(epochMs).toISOString().slice(0, 10);
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
export async function getWclData(
	env: WclEnv,
	cores?: WclSource[]
): Promise<WclData | null> {
	try {
		const list = cores ?? defaultSources();
		if (list.length === 0) return null;

		const token = await getToken(env);
		if (!token) return null;

		const guildIds = list.map((c) => c.wclGuildId);
		const tagMap = tagToCore();

		const res = await fetch(GRAPHQL_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ query: buildBatchedQuery(guildIds) })
		});
		if (!res.ok) return null;

		const json = (await res.json()) as {
			data?: Record<string, GuildReports>;
			errors?: unknown;
		};
		if (!json.data) return null;

		const killedBossNames = new Set<string>();
		// wclGuildId → set of killed boss names for that single core.
		const perCoreSets = new Map<number, Set<string>>();
		// wclGuildId → activity stats accumulator for that core.
		const statsByCore = new Map<number, WclCoreStats>();
		// boss+core → earliest kill candidate (one feat per boss per core).
		const perBossCore = new Map<string, WclFeat>();

		list.forEach((source, i) => {
			const block = json.data?.[`g${i}`];
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
	} catch {
		return null;
	}
}

// ── Character-level integration (officer enrichment + Hall of Fame) ──────────

/** Run a GraphQL query against the WCL client API. Returns parsed JSON or null. */
async function gql<T>(token: string, query: string): Promise<T | null> {
	const res = await fetch(GRAPHQL_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ query })
	});
	if (!res.ok) return null;
	const json = (await res.json()) as { data?: T; errors?: unknown };
	return json.data ?? null;
}

/** Escape a character name for safe inlining inside a GraphQL string literal. */
function gqlStr(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

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

type CharacterNode = {
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
function toWclCharacter(name: string, node: CharacterNode): WclCharacter {
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
function buildCharacterQuery(names: string[]): string {
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

/**
 * Enrich officers with class / spec / parse score from WCL. Batches ALL officer
 * names into a single aliased query. Names that don't resolve are simply
 * omitted from the result map (caller keeps name+role only). Resilient: any
 * failure → null.
 *
 * @returns Map keyed by officer name → WclCharacter, or null on failure.
 */
export async function getWclOfficers(
	env: WclEnv,
	names?: string[]
): Promise<Record<string, WclCharacter> | null> {
	try {
		const list = names ?? staticOfficers.map((o) => o.name);
		if (list.length === 0) return null;

		const token = await getToken(env);
		if (!token) return null;

		const data = await gql<Record<string, { character: CharacterNode }>>(
			token,
			buildCharacterQuery(list)
		);
		if (!data) return null;

		const out: Record<string, WclCharacter> = {};
		list.forEach((name, i) => {
			const node = data[`c${i}`]?.character ?? null;
			if (!node) return; // Unresolved name → skip (officer shows name+role only).
			const ch = toWclCharacter(name, node);
			// Only include if we learned anything useful.
			if (ch.wowClass || ch.spec || ch.score != null) out[name] = ch;
		});
		return out;
	} catch {
		return null;
	}
}

// ── Per-character detail (internal player page) ──────────────────────────────
//
// Source: ONE `characterData.character(...).zoneRankings(zoneID:1056)` query.
// The JSON scalar carries `bestPerformanceAverage`, `medianPerformanceAverage`,
// `metric`, an `allStars[]` array (per-spec points + world/region/server ranks)
// and a `rankings[]` array (one per SSC/TK boss). All fields are defensive: WCL
// returns `"-"` strings for unranked numbers and may omit/null anything, so we
// coerce carefully and never throw.

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
	} catch {
		return null;
	}
}

// ── Hall of Fame ─────────────────────────────────────────────────────────────
//
// Source: `reportData.report(code).rankings`. That JSON scalar is an array of
// fights, each with `roles.{tanks,healers,dps}.characters[]`. Every character
// carries `name`, `class` (English class string), `spec` and `rankPercent`
// (the 0–100 parse). Characters are already bucketed by role, so no spec→role
// guessing is needed. We aggregate the BEST rankPercent per character per role
// across the recent reports of all cores, then take the top N per role.

/** English class name (as it comes from report rankings) → our WowClass. */
const CLASS_NAME_TO_CLASS: Record<string, WowClass> = {
	Warrior: 'Warrior',
	Paladin: 'Paladin',
	Hunter: 'Hunter',
	Rogue: 'Rogue',
	Priest: 'Priest',
	Shaman: 'Shaman',
	Mage: 'Mage',
	Warlock: 'Warlock',
	Druid: 'Druid',
	DeathKnight: 'Warrior', // not in TBC, but stay defensive
	'Death Knight': 'Warrior'
};

type RankChar = {
	name?: string | null;
	class?: string | null;
	spec?: string | null;
	rankPercent?: number | null;
};
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

/** Max recent kills kept per player in the histórico. */
const MAX_RECENT_PER_PLAYER = 12;

/**
 * Reports per core to pull rankings from. Kept low — each report is one inner
 * batched fight set — but enough to cover the active roster across SSC/TK.
 */
const HOF_REPORTS_PER_CORE = 4;

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

/** Chunk size for the batched zoneRankings roster fetch (expensive scalar). */
const ZONE_SCORE_CHUNK = 20;

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

/**
 * Build the Hall of Fame AND a reliable per-character map.
 *
 * Roster/role/class/core are discovered from report rankings
 * (`roles.{tanks,healers,dps}`) — what each player ACTUALLY played, far more
 * reliable in Fresh TBC than `zoneRankings.bestSpec`. The SCORE, however, is the
 * player's `zoneRankings.bestPerformanceAverage` (fetched per roster name), so
 * the Hall of Fame / rosters / per-class boards rank by the SAME number the
 * /jugador/NAME page shows — everything stays coherent. Report-parse scores are
 * the fallback when a name has no zoneRankings.
 *
 * Phases: report codes per core → report rankings (chunked) → roster zone scores
 * (chunked). Fully resilient — returns null on any failure or if empty.
 */
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
		const guildIds = list.map((c) => c.wclGuildId);
		const tagMap = tagToCore();
		type ReportCodes = { reports: { data: { code: string; guildTag: GuildTag }[] } };
		const codesData = await gql<Record<string, ReportCodes>>(
			token,
			buildReportCodesQuery(guildIds)
		);
		if (!codesData) return null;

		// code → core display name, and code → core wclGuildId (for rosters).
		// Parent reports are attributed to the right core by their raid-team tag.
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
		const allCodes = [...codeToCore.keys()];
		if (allCodes.length === 0) return null;

		// best[role] : name(lower) → entry (highest rankPercent kept).
		const best = new Map<SpecRole, Map<string, HallOfFameEntry>>([
			['DPS', new Map()],
			['Healer', new Map()],
			['Tank', new Map()]
		]);
		// name(lower) → best parse across ALL roles (reliable officer enrichment).
		const characters = new Map<string, WclCharacter>();
		// wclGuildId → (name(lower) → best parse within that core). Each core's
		// roster keeps the single best parse per character seen in its reports.
		const rosterByGuild = new Map<number, Map<string, WclCharacter>>();
		// name(lower) → raw recent kills (one per fight the player was in). Deduped,
		// sorted and capped at the end. Powers the player-detail "histórico".
		const recentRaw = new Map<string, WclRecentKill[]>();
		// boss name → (name(lower) → best parse on that boss). Per-boss leaderboard.
		const byBossMap = new Map<string, Map<string, BossLeaderEntry>>();

		/** Record a player's best parse on a given boss (per-boss leaderboard). */
		const considerBoss = (ch: RankChar | null | undefined, boss: string, core: string) => {
			const name = ch?.name?.trim();
			const pct = ch?.rankPercent;
			if (!name || !boss || typeof pct !== 'number' || pct <= 0) return;
			const score = Math.round(pct);
			const key = name.toLowerCase();
			let bucket = byBossMap.get(boss);
			if (!bucket) {
				bucket = new Map<string, BossLeaderEntry>();
				byBossMap.set(boss, bucket);
			}
			const prev = bucket.get(key);
			if (!prev || score > prev.score) {
				const wowClass = ch?.class ? CLASS_NAME_TO_CLASS[ch.class] : undefined;
				bucket.set(key, {
					name,
					wowClass,
					classLabel: wowClass ? CLASS_LABEL_ES[wowClass] : undefined,
					classColor: wowClass ? CLASS_COLOR[wowClass] : undefined,
					spec: ch?.spec ?? undefined,
					core,
					score
				});
			}
		};

		/** Record one fight a player was present in (for the histórico). */
		const recordKill = (
			ch: RankChar | null | undefined,
			boss: string,
			date: string,
			core: string
		) => {
			const name = ch?.name?.trim();
			if (!name || !boss) return;
			const key = name.toLowerCase();
			const list = recentRaw.get(key) ?? [];
			const pct = ch?.rankPercent;
			list.push({
				boss,
				date,
				parse: typeof pct === 'number' && pct > 0 ? Math.round(pct) : null,
				core
			});
			recentRaw.set(key, list);
		};

		const consider = (
			ch: RankChar | null | undefined,
			role: SpecRole,
			core: string,
			guildId: number | undefined
		) => {
			const name = ch?.name?.trim();
			const pct = ch?.rankPercent;
			if (!name || typeof pct !== 'number' || pct <= 0) return;
			const score = Math.round(pct);
			const wowClass = ch?.class ? CLASS_NAME_TO_CLASS[ch.class] : undefined;
			const spec = ch?.spec ?? undefined;
			const key = name.toLowerCase();

			const entry: HallOfFameEntry = {
				name,
				wowClass,
				classLabel: wowClass ? CLASS_LABEL_ES[wowClass] : undefined,
				classColor: wowClass ? CLASS_COLOR[wowClass] : undefined,
				spec,
				role,
				core,
				score
			};
			const bucket = best.get(role)!;
			const prev = bucket.get(key);
			if (!prev || score > prev.score) bucket.set(key, entry);

			// Character map: keep the highest-scoring parse regardless of role, so
			// officer cards show the class/spec/role they actually played.
			const prevChar = characters.get(key);
			if (!prevChar || score > (prevChar.score ?? -1)) {
				characters.set(key, {
					name,
					wowClass,
					classLabel: wowClass ? CLASS_LABEL_ES[wowClass] : undefined,
					spec,
					specRole: role,
					score
				});
			}

			// Per-core roster: bucket into the character's core, keeping the best
			// parse per character WITHIN that core (with the class/spec/role of it).
			if (guildId != null) {
				let roster = rosterByGuild.get(guildId);
				if (!roster) {
					roster = new Map<string, WclCharacter>();
					rosterByGuild.set(guildId, roster);
				}
				const prevMember = roster.get(key);
				if (!prevMember || score > (prevMember.score ?? -1)) {
					roster.set(key, {
						name,
						wowClass,
						classLabel: wowClass ? CLASS_LABEL_ES[wowClass] : undefined,
						spec,
						specRole: role,
						score
					});
				}
			}
		};

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
				const date =
					typeof report?.startTime === 'number' ? toIsoDate(report.startTime) : null;
				for (const fight of fights) {
					const roles = fight?.roles;
					if (!roles) continue;
					const boss = fight?.encounter?.name ?? null;
					for (const c of roles.tanks?.characters ?? []) {
						consider(c, 'Tank', core, guildId);
						if (boss) considerBoss(c, boss, core);
						if (boss && date) recordKill(c, boss, date, core);
					}
					for (const c of roles.healers?.characters ?? []) {
						consider(c, 'Healer', core, guildId);
						if (boss) considerBoss(c, boss, core);
						if (boss && date) recordKill(c, boss, date, core);
					}
					for (const c of roles.dps?.characters ?? []) {
						consider(c, 'DPS', core, guildId);
						if (boss) considerBoss(c, boss, core);
						if (boss && date) recordKill(c, boss, date, core);
					}
				}
			});
		}

		// Phase 3 — coherent scores: replace each player's report-parse score with
		// their zoneRankings bestPerformanceAverage (the same metric /jugador/NAME
		// shows). Falls back to the report parse for names without zoneRankings, so
		// no one disappears. One fetch per ~20 names, riding this 1h cache.
		const rosterNames = [...characters.values()].map((c) => c.name);
		const zoneScores = await fetchZoneScores(token, rosterNames);
		const scoreFor = (name: string, fallback: number): number =>
			zoneScores.get(name.toLowerCase()) ?? fallback;

		for (const bucket of best.values()) {
			for (const e of bucket.values()) e.score = scoreFor(e.name, e.score);
		}
		for (const c of characters.values()) {
			if (c.score != null) c.score = scoreFor(c.name, c.score);
		}
		for (const roster of rosterByGuild.values()) {
			for (const m of roster.values()) {
				if (m.score != null) m.score = scoreFor(m.name, m.score);
			}
		}

		const top = (role: SpecRole): HallOfFameEntry[] =>
			[...best.get(role)!.values()].sort((a, b) => b.score - a.score).slice(0, HOF_TOP_N);

		const hof: HallOfFame = {
			dps: top('DPS'),
			healers: top('Healer'),
			tanks: top('Tank')
		};
		if (hof.dps.length + hof.healers.length + hof.tanks.length === 0) return null;

		// Per-core rosters: sort each core's members by score descending.
		const rosters: Record<number, WclCharacter[]> = {};
		for (const [guildId, members] of rosterByGuild) {
			rosters[guildId] = [...members.values()].sort(
				(a, b) => (b.score ?? -1) - (a.score ?? -1)
			);
		}

		// Per-player histórico: dedupe each player's kills by boss+date (keeping the
		// highest parse), sort newest-first (then by parse), cap per player.
		const recentByPlayer: Record<string, WclRecentKill[]> = {};
		for (const [key, kills] of recentRaw) {
			const byBossDate = new Map<string, WclRecentKill>();
			for (const k of kills) {
				const id = `${k.boss}::${k.date}`;
				const prev = byBossDate.get(id);
				if (!prev || (k.parse ?? -1) > (prev.parse ?? -1)) byBossDate.set(id, k);
			}
			const deduped = [...byBossDate.values()].sort(
				(a, b) =>
					(a.date < b.date ? 1 : a.date > b.date ? -1 : 0) || (b.parse ?? -1) - (a.parse ?? -1)
			);
			recentByPlayer[key] = deduped.slice(0, MAX_RECENT_PER_PLAYER);
		}

		// Per-class leaderboard: group the best-parse character map by class, sort
		// each class's members by score desc, cap at HOF_TOP_N.
		const byClass: Record<string, WclCharacter[]> = {};
		for (const ch of characters.values()) {
			if (!ch.wowClass) continue;
			(byClass[ch.wowClass] ??= []).push(ch);
		}
		for (const cls of Object.keys(byClass)) {
			byClass[cls] = byClass[cls]
				.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
				.slice(0, HOF_TOP_N);
		}

		// Per-boss leaderboard: top N parses per boss, sorted by score desc.
		const byBoss: Record<string, BossLeaderEntry[]> = {};
		for (const [boss, bucket] of byBossMap) {
			byBoss[boss] = [...bucket.values()].sort((a, b) => b.score - a.score).slice(0, HOF_TOP_N);
		}

		return {
			hallOfFame: hof,
			characters: Object.fromEntries(characters),
			rosters,
			recentByPlayer,
			byClass,
			byBoss
		};
	} catch {
		return null;
	}
}

// ── Guild progress rank (world / region / server) ────────────────────────────
//
// Source: `guildData.guild(id).zoneRanking(zoneId:1056).progress(size:25)`, the
// authoritative world/region/server progress rank for the guild in SSC/TK — no
// report scanning. NOTE: ranks are per GUILD OBJECT, so a core whose logs live
// on the parent (e.g. Core 4) has no own-guild rank; the parent's rank is the
// whole-guild figure. Raid size 25 is required for Classic.

/** Raid size for SSC/TK (25-man) — required by zoneRanking. */
const RAID_SIZE = 25;

/** World/region/server rank numbers for a guild's zone progress. */
export type WclRankTriple = { world: number | null; region: number | null; server: number | null };

export type WclProgress = {
	/** Whole-guild ("Jefe de Guerra") progress rank in SSC/TK, or null. */
	guild: WclRankTriple | null;
	/** wclGuildId → that core's OWN guild-object progress rank (only when ranked). */
	perCore: Record<number, WclRankTriple>;
};

type RankNode = { number?: number | null } | null;
type ProgressNode = {
	zoneRanking?: {
		progress?: {
			worldRank?: RankNode;
			regionRank?: RankNode;
			serverRank?: RankNode;
		} | null;
	} | null;
} | null;

/** Coerce a rank node's `number` to a positive int, else null. */
function rankNum(node: RankNode | undefined): number | null {
	const n = node?.number;
	return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function toRankTriple(p: ProgressNode): WclRankTriple | null {
	const pr = p?.zoneRanking?.progress;
	if (!pr) return null;
	const triple = {
		world: rankNum(pr.worldRank),
		region: rankNum(pr.regionRank),
		server: rankNum(pr.serverRank)
	};
	if (triple.world == null && triple.region == null && triple.server == null) return null;
	return triple;
}

/** Build the batched progress query: one aliased guild block per source. */
function buildProgressQuery(guildIds: number[]): string {
	const blocks = guildIds
		.map(
			(id, i) => `p${i}: guildData {
    guild(id: ${id}) {
      zoneRanking(zoneId: ${SSC_TK_ZONE_ID}) {
        progress(size: ${RAID_SIZE}) {
          worldRank { number }
          regionRank { number }
          serverRank { number }
        }
      }
    }
  }`
		)
		.join('\n  ');
	return `query {\n  ${blocks}\n}`;
}

/**
 * Fetch the guild + per-core progress rank (world/region/server) for SSC/TK in a
 * single batched query. Resilient: missing creds / any error → null. The parent
 * source provides the whole-guild rank; per-core ranks are only present for cores
 * whose own guild object is ranked.
 */
export async function getWclProgress(
	env: WclEnv,
	cores?: WclSource[]
): Promise<WclProgress | null> {
	try {
		const list = cores ?? defaultSources();
		if (list.length === 0) return null;

		const token = await getToken(env);
		if (!token) return null;

		const guildIds = list.map((c) => c.wclGuildId);
		const data = await gql<Record<string, ProgressNode>>(token, buildProgressQuery(guildIds));
		if (!data) return null;

		let guild: WclRankTriple | null = null;
		const perCore: Record<number, WclRankTriple> = {};
		list.forEach((source, i) => {
			const triple = toRankTriple(data[`p${i}`] ?? null);
			if (!triple) return;
			if (source.isParent) guild = triple;
			else perCore[source.wclGuildId] = triple;
		});

		if (!guild && Object.keys(perCore).length === 0) return null;
		return { guild, perCore };
	} catch {
		return null;
	}
}

// ── Attendance (active roster / consistency) ─────────────────────────────────
//
// Source: `guildData.guild(id).attendance(zoneID:1056)` — works for Classic.
// Because logs are fragmented, a core's attendance is gathered from BOTH its own
// guild object AND the parent guild filtered by the core's raid-team tag, then
// merged (deduped by report code). Per player: raids attended / raids logged.

/** Recent attendance reports per core to consider. */
const ATTENDANCE_REPORTS = 10;

/** One player's attendance within a core. */
export type WclAttendee = {
	name: string;
	wowClass?: WowClass;
	classLabel?: string;
	classColor?: string;
	/** Raids attended (present). */
	attended: number;
	/** Raids logged for this core in the window. */
	total: number;
};

export type WclAttendance = {
	/** wclGuildId → attendees sorted by raids attended (desc). */
	perCore: Record<number, WclAttendee[]>;
};

type AttendancePlayer = { name?: string | null; type?: string | null; presence?: number | null };
type AttendanceReport = { code?: string | null; players?: AttendancePlayer[] | null };
type AttendanceNode = {
	guild?: { attendance?: { data?: AttendanceReport[] | null } | null } | null;
} | null;

/**
 * Build the batched attendance query: per core, one block for its own guild
 * object and one for the parent filtered to the core's tag. Cores without a
 * `wclTagId` only get the own-guild block.
 */
function buildAttendanceQuery(teams: { wclGuildId: number; wclTagId?: number }[]): string {
	const blocks: string[] = [];
	teams.forEach((t, i) => {
		blocks.push(`o${i}: guildData {
    guild(id: ${t.wclGuildId}) {
      attendance(zoneID: ${SSC_TK_ZONE_ID}, limit: ${ATTENDANCE_REPORTS}) {
        data { code players { name type presence } }
      }
    }
  }`);
		if (typeof t.wclTagId === 'number') {
			blocks.push(`t${i}: guildData {
    guild(id: ${PARENT_GUILD.wclGuildId}) {
      attendance(zoneID: ${SSC_TK_ZONE_ID}, guildTagID: ${t.wclTagId}, limit: ${ATTENDANCE_REPORTS}) {
        data { code players { name type presence } }
      }
    }
  }`);
		}
	});
	return `query {\n  ${blocks.join('\n  ')}\n}`;
}

/**
 * Fetch per-core attendance (active roster + consistency) in one batched query.
 * Each core merges its own-guild reports with the parent's reports for its tag,
 * deduped by report code. Resilient: missing creds / any error → null; cores
 * with no reports are simply absent from `perCore`.
 */
export async function getWclAttendance(env: WclEnv): Promise<WclAttendance | null> {
	try {
		const teams = staticTeams.filter(
			(t): t is typeof t & { wclGuildId: number } => typeof t.wclGuildId === 'number'
		);
		if (teams.length === 0) return null;

		const token = await getToken(env);
		if (!token) return null;

		const data = await gql<Record<string, AttendanceNode>>(token, buildAttendanceQuery(teams));
		if (!data) return null;

		const perCore: Record<number, WclAttendee[]> = {};
		teams.forEach((t, i) => {
			// Merge own-guild + parent-by-tag reports, deduped by report code.
			const reports = new Map<string, AttendanceReport>();
			for (const alias of [`o${i}`, `t${i}`]) {
				const rows = data[alias]?.guild?.attendance?.data ?? [];
				for (const r of rows) {
					const code = r?.code ?? undefined;
					if (code && !reports.has(code)) reports.set(code, r);
				}
			}
			const total = reports.size;
			if (total === 0) return;

			// name(lower) → attendee accumulator.
			const acc = new Map<string, WclAttendee>();
			for (const r of reports.values()) {
				for (const p of r.players ?? []) {
					const name = p?.name?.trim();
					if (!name) continue;
					const key = name.toLowerCase();
					let a = acc.get(key);
					if (!a) {
						const wowClass = p?.type ? CLASS_NAME_TO_CLASS[p.type] : undefined;
						a = {
							name,
							wowClass,
							classLabel: wowClass ? CLASS_LABEL_ES[wowClass] : undefined,
							classColor: wowClass ? CLASS_COLOR[wowClass] : undefined,
							attended: 0,
							total
						};
						acc.set(key, a);
					}
					// presence === 1 means the player was present that raid.
					if (p?.presence === 1) a.attended += 1;
				}
			}
			const list = [...acc.values()]
				.filter((a) => a.attended > 0)
				.sort((a, b) => b.attended - a.attended);
			if (list.length > 0) perCore[t.wclGuildId] = list;
		});

		if (Object.keys(perCore).length === 0) return null;
		return { perCore };
	} catch {
		return null;
	}
}
