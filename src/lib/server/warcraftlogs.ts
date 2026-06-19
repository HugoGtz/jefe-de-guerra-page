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
		const list =
			cores ??
			staticTeams
				.filter((t): t is typeof t & { wclGuildId: number } => typeof t.wclGuildId === 'number')
				.map((t) => ({ wclGuildId: t.wclGuildId, name: t.name }));
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
	roles?: {
		tanks?: { characters?: RankChar[] | null } | null;
		healers?: { characters?: RankChar[] | null } | null;
		dps?: { characters?: RankChar[] | null } | null;
	} | null;
};
/** The `rankings` JSON scalar is an object wrapping the fights in `data`. */
type ReportRankings = { data?: RankFight[] | null } | null;

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

/** Batched query: `rankings` JSON for several report codes (1 request). */
function buildReportRankingsQuery(codes: string[]): string {
	const blocks = codes
		.map(
			(code, i) => `q${i}: reportData {
    report(code: "${gqlStr(code)}") { rankings }
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
		const list =
			cores ??
			staticTeams
				.filter((t): t is typeof t & { wclGuildId: number } => typeof t.wclGuildId === 'number')
				.map((t) => ({ wclGuildId: t.wclGuildId, name: t.name }));
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
			const data = await gql<Record<string, { report: { rankings: ReportRankings } | null }>>(
				token,
				buildReportRankingsQuery(chunk)
			);
			if (!data) continue; // Skip a failed chunk; keep what we have.

			chunk.forEach((code, i) => {
				const fights = data[`q${i}`]?.report?.rankings?.data ?? [];
				const core = codeToCore.get(code) ?? 'Core';
				const guildId = codeToGuildId.get(code);
				for (const fight of fights) {
					const roles = fight?.roles;
					if (!roles) continue;
					for (const c of roles.tanks?.characters ?? []) consider(c, 'Tank', core, guildId);
					for (const c of roles.healers?.characters ?? []) consider(c, 'Healer', core, guildId);
					for (const c of roles.dps?.characters ?? []) consider(c, 'DPS', core, guildId);
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

		return { hallOfFame: hof, characters: Object.fromEntries(characters), rosters };
	} catch {
		return null;
	}
}
