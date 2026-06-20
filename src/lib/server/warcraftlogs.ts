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
/** Server slug / region for every character lookup. */
const SERVER_SLUG = 'dreamscythe';
const SERVER_REGION = 'us';
/** Top N per role surfaced in the Hall of Fame. */
const HOF_TOP_N = 10;

/**
 * Parent/umbrella guild "Jefe de Guerra" (its OWN WCL logs — the most active
 * source). The GLOBAL views (Hall of Fame, recent feats, global progress) are
 * built from the parent PLUS the 7 cores, deduped. Per-core cards/rosters still
 * read their own core id; the parent is just an extra source in the aggregate
 * (its bucket is keyed by this id and ignored by the per-core lookups).
 */
const PARENT_GUILD = { wclGuildId: 792187, name: 'General' };

/** Default aggregate sources for the global queries: parent + every core. */
function defaultSources(): { wclGuildId: number; name: string }[] {
	const cores = staticTeams
		.filter((t): t is typeof t & { wclGuildId: number } => typeof t.wclGuildId === 'number')
		.map((t) => ({ wclGuildId: t.wclGuildId, name: t.name }));
	return [PARENT_GUILD, ...cores];
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

export type WclData = {
	/** Union of every boss name killed across all cores. */
	killedBossNames: Set<string>;
	/** Per-core (wclGuildId → killed boss names) so each Core card shows ITS progress. */
	perCore: Record<number, string[]>;
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

type FightNode = { name: string; encounterID: number };
type ReportNode = {
	code: string;
	title: string;
	startTime: number;
	zone: { id: number; name: string } | null;
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
        fights(killType: Kills) { name encounterID }
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
 * @param cores Optional list of { wclGuildId, name } cores; defaults to the
 *              static teams that have a wclGuildId.
 * @returns Aggregated data, or `null` if creds are missing or anything fails.
 */
export async function getWclData(
	env: WclEnv,
	cores?: { wclGuildId: number; name: string }[]
): Promise<WclData | null> {
	try {
		const list = cores ?? defaultSources();
		if (list.length === 0) return null;

		const token = await getToken(env);
		if (!token) return null;

		const guildIds = list.map((c) => c.wclGuildId);
		const idToName = new Map(list.map((c) => [c.wclGuildId, c.name]));

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
		// boss+core → earliest kill candidate (one feat per boss per core).
		const perBossCore = new Map<string, WclFeat>();

		guildIds.forEach((id, i) => {
			const block = json.data?.[`g${i}`];
			const reports = block?.reports?.data ?? [];
			const team = idToName.get(id) ?? `Core ${i + 1}`;
			let coreSet = perCoreSets.get(id);
			if (!coreSet) {
				coreSet = new Set<string>();
				perCoreSets.set(id, coreSet);
			}
			for (const report of reports) {
				const date = toIsoDate(report.startTime);
				for (const fight of report.fights ?? []) {
					if (!fight?.name) continue;
					killedBossNames.add(fight.name);
					coreSet.add(fight.name);

					const key = `${fight.name}::${team}`;
					const existing = perBossCore.get(key);
					// Keep the EARLIEST date for this boss+core (first kill for the core).
					if (!existing || date < existing.date) {
						perBossCore.set(key, {
							boss: fight.name,
							date,
							team,
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

		return { killedBossNames, perCore, feats: feats.slice(0, MAX_FEATS) };
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
      zoneRankings(zoneID: ${SSC_TK_ZONE_ID})
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
      zoneRankings(zoneID: ${SSC_TK_ZONE_ID})
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

/** Batched query: recent report codes per core (1 request). */
function buildReportCodesQuery(guildIds: number[]): string {
	const blocks = guildIds
		.map(
			(id, i) => `r${i}: reportData {
    reports(guildID: ${id}, limit: ${HOF_REPORTS_PER_CORE}, zoneID: ${SSC_TK_ZONE_ID}) {
      data { code }
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

/**
 * Build the Hall of Fame AND a reliable per-character map in ONE fetch.
 *
 * Both are derived from the SAME report rankings (`roles.{tanks,healers,dps}`),
 * which record the spec/role/class a player ACTUALLY played that night — far
 * more reliable in Fresh TBC than `zoneRankings.bestSpec`. The HoF keeps the
 * best parse per character per ROLE (top N per role); the character map keeps
 * the single best parse per character across every role (used to enrich
 * officers with class/spec/specRole/score).
 *
 * Two-phase (report codes per core, then rankings per report in batched chunks)
 * and fully resilient — returns null on any failure or if empty.
 */
export async function getWclRankings(
	env: WclEnv,
	cores?: { wclGuildId: number; name: string }[]
): Promise<WclRankings | null> {
	try {
		const list = cores ?? defaultSources();
		if (list.length === 0) return null;

		const token = await getToken(env);
		if (!token) return null;

		// Phase 1 — recent report codes per core (single batched query).
		const guildIds = list.map((c) => c.wclGuildId);
		const idToName = new Map(list.map((c) => [c.wclGuildId, c.name]));
		// The id IS the wclGuildId; keep an explicit map for roster bucketing.
		const idToGuildId = new Map(list.map((c) => [c.wclGuildId, c.wclGuildId]));
		type ReportCodes = { reports: { data: { code: string }[] } };
		const codesData = await gql<Record<string, ReportCodes>>(
			token,
			buildReportCodesQuery(guildIds)
		);
		if (!codesData) return null;

		// code → core display name, and code → core wclGuildId (for rosters).
		const codeToCore = new Map<string, string>();
		const codeToGuildId = new Map<string, number>();
		guildIds.forEach((id, i) => {
			const core = idToName.get(id) ?? `Core ${i + 1}`;
			const guildId = idToGuildId.get(id) ?? id;
			for (const r of codesData[`r${i}`]?.reports?.data ?? []) {
				if (r?.code && !codeToCore.has(r.code)) {
					codeToCore.set(r.code, core);
					codeToGuildId.set(r.code, guildId);
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
						if (boss && date) recordKill(c, boss, date, core);
					}
					for (const c of roles.healers?.characters ?? []) {
						consider(c, 'Healer', core, guildId);
						if (boss && date) recordKill(c, boss, date, core);
					}
					for (const c of roles.dps?.characters ?? []) {
						consider(c, 'DPS', core, guildId);
						if (boss && date) recordKill(c, boss, date, core);
					}
				}
			});
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

		return {
			hallOfFame: hof,
			characters: Object.fromEntries(characters),
			rosters,
			recentByPlayer
		};
	} catch {
		return null;
	}
}
