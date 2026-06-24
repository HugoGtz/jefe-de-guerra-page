/**
 * Server-side guild data access ORCHESTRATOR.
 *
 * Builds the `GuildData` the UI consumes (the types in `$lib/data/*`) from the
 * Cloudflare D1 binding (`platform.env.DB`) via a typed Drizzle client and a set
 * of repositories (`$lib/server/repositories/*`). Repositories own the SQL and
 * the row→domain mapping; this module owns composition, the WarcraftLogs live
 * overrides (D1-cached) and the static-fallback policy.
 *
 * If there is no D1 binding, or any query throws, it falls back to the static
 * constants from `$lib/data/*` so the site keeps working before/without a
 * database — the site must never crash if D1 is down.
 */

import { guild as staticGuild, type Guild } from '$lib/data/guild';
import {
	phases as staticPhases,
	type Phase,
	type Raid,
	type Boss
} from '$lib/data/raids';
import { officers as staticOfficers, type Officer } from '$lib/data/officers';
import {
	recruitment as staticRecruitment,
	type Recruitment
} from '$lib/data/recruitment';
import { teams as staticTeams, type Team } from '$lib/data/teams';
import { feats as staticFeats, type Feat } from '$lib/data/kills';
import { faq as staticFaq, type FaqItem } from '$lib/data/faq';
import {
	discordServerId as staticDiscordServerId,
	discordInvite as staticDiscordInvite,
	raidTimezone as staticRaidTimezone,
	raidNights as staticRaidNights,
	type RaidNight
} from '$lib/data/community';
import {
	getWclData,
	getWclOfficers,
	getWclRankings,
	getWclCharacter,
	getWclProgress,
	getWclAttendance,
	CLASS_COLOR,
	type WclData,
	type WclCoreStats,
	type WclFeat,
	type WclCharacter,
	type HallOfFame,
	type WclRankings,
	type WclCharacterDetail,
	type WclBossDetail,
	type WclRecentKill,
	type WclProgress,
	type WclAttendance
} from '$lib/server/warcraftlogs';
import { getDb, type Db } from '$lib/server/db/client';
import {
	getGuild,
	getPhases,
	getTeams,
	getOfficers,
	getRecruitment,
	getFeats,
	getFaq,
	getCommunityMeta,
	getRaidNights,
	getCache,
	setCache,
	withRaidProgress,
	phasePercent,
	type CacheEntry
} from '$lib/server/repositories';

/** Guild-wide stats surfaced in the UI, derived from WCL (or manual fallback). */
export type GuildStats = {
	/** Distinct Phase 2 (SSC + TK) bosses down across all cores. */
	phase2BossesDown: number;
	/** Total Phase 2 bosses (SSC 6 + TK 4 = 10). */
	phase2BossesTotal: number;
	/** Number of raid teams (cores). */
	activeCores: number;
	/** Most recent feat, or null if none. */
	lastFeat: { boss: string; date: string; team?: string } | null;
	/** Feats within 30 days of the newest feat date. */
	killsLast30Days: number;
	/** Core with the most SSC+TK kills (name + count), or null. */
	topCore: { name: string; kills: number } | null;
	/** Cores at SSC 6/6 AND TK 4/4. */
	fullClearCores: number;
};

export type GuildData = {
	guild: Guild;
	phases: Phase[];
	officers: Officer[];
	recruitment: Recruitment;
	teams: Team[];
	feats: Feat[];
	faq: FaqItem[];
	stats: GuildStats;
	/** Top-10 DPS / Healers / Tanks across all cores (WCL), or null if unavailable. */
	hallOfFame: HallOfFame | null;
	community: {
		discordServerId: string;
		discordInvite: string;
		raidTimezone: string;
		raidNights: RaidNight[];
	};
};

/** Static fallback assembled from the hardcoded data files. */
function staticFallback(): GuildData {
	return {
		guild: staticGuild,
		phases: staticPhases,
		officers: staticOfficers,
		recruitment: staticRecruitment,
		teams: withTeamPercents(staticTeams),
		feats: staticFeats,
		faq: staticFaq,
		stats: computeStats(staticPhases, staticFeats, staticTeams, Date.now()),
		hallOfFame: null,
		community: {
			discordServerId: staticDiscordServerId,
			discordInvite: staticDiscordInvite,
			raidTimezone: staticRaidTimezone,
			raidNights: staticRaidNights
		}
	};
}

// ── WarcraftLogs integration (live progress + feats, D1-cached) ──────────────

/** How long a cached WCL aggregate stays fresh before we refetch (~10 min).
   This is the "live" guild progress/feats query (1 cheap batched call). The
   heavier officer/HoF caches stay long below to avoid the rate limit. */
const WCL_CACHE_TTL_MS = 10 * 60 * 1000;
const WCL_CACHE_KEY = 'guild';

/** Officer enrichment (class/spec/score) — expensive, ~1h TTL. */
const WCL_OFFICERS_TTL_MS = 60 * 60 * 1000;
const WCL_OFFICERS_KEY = 'officers';

/**
 * Report rankings (per-core roster + parses) — heaviest endpoint, ~1h TTL.
 * ONE fetch feeds BOTH the Hall of Fame and reliable officer spec enrichment.
 */
const WCL_HOF_TTL_MS = 60 * 60 * 1000;
const WCL_HOF_KEY = 'hall_of_fame_v4';

/** Per-character detail (internal player page) — cached ~1h, keyed per name. */
const WCL_CHARACTER_TTL_MS = 60 * 60 * 1000;

/** Guild + per-core progress rank (world/region/server) — changes slowly, ~6h. */
const WCL_PROGRESS_TTL_MS = 6 * 60 * 60 * 1000;
const WCL_PROGRESS_KEY = 'progress';

/** Per-core attendance — heavier (own-guild + parent-by-tag), ~6h TTL. */
const WCL_ATTENDANCE_TTL_MS = 6 * 60 * 60 * 1000;
const WCL_ATTENDANCE_KEY = 'attendance';

/** English boss name → our Feat raid bucket. Covers Phase 1 + Phase 2 bosses. */
const BOSS_TO_RAID: Record<string, Feat['raid']> = {
	// SSC
	'Hydross the Unstable': 'SSC',
	'The Lurker Below': 'SSC',
	'Leotheras the Blind': 'SSC',
	'Fathom-Lord Karathress': 'SSC',
	'Morogrim Tidewalker': 'SSC',
	'Lady Vashj': 'SSC',
	// TK
	"Al'ar": 'TK',
	'Void Reaver': 'TK',
	'High Astromancer Solarian': 'TK',
	"Kael'thas Sunstrider": 'TK',
	// Karazhan
	'Attumen the Huntsman': 'Karazhan',
	Moroes: 'Karazhan',
	'Maiden of Virtue': 'Karazhan',
	'Opera Event': 'Karazhan',
	'The Curator': 'Karazhan',
	'Terestian Illhoof': 'Karazhan',
	'Shade of Aran': 'Karazhan',
	Netherspite: 'Karazhan',
	'Chess Event': 'Karazhan',
	'Prince Malchezaar': 'Karazhan',
	// Gruul's Lair
	'High King Maulgar': 'Gruul',
	'Gruul the Dragonkiller': 'Gruul',
	// Magtheridon's Lair
	Magtheridon: 'Magtheridon'
};

/** Map a killed boss name to a Feat raid bucket, defaulting to SSC if unknown. */
function raidForBoss(boss: string): Feat['raid'] {
	return BOSS_TO_RAID[boss] ?? 'SSC';
}

/** SSC bosses (English names, as they come from WCL fights). */
const SSC_BOSSES = new Set<string>([
	'Hydross the Unstable',
	'The Lurker Below',
	'Leotheras the Blind',
	'Fathom-Lord Karathress',
	'Morogrim Tidewalker',
	'Lady Vashj'
]);
/** TK (The Eye) bosses. */
const TK_BOSSES = new Set<string>([
	"Al'ar",
	'Void Reaver',
	'High Astromancer Solarian',
	"Kael'thas Sunstrider"
]);
const SSC_TOTAL = 6;
const TK_TOTAL = 4;

/**
 * Bosses that count as the CURRENT live progression (Phase 2 = SSC + TK). The
 * WCL aggregate pulls every recent report, which also includes Phase 1 farm
 * kills (Karazhan / Gruul / Magtheridon); those must NOT leak into the live
 * feats or feat-derived stats now that the guild is on Phase 2. Update this when
 * a new phase opens.
 */
const PHASE_2_BOSSES = new Set<string>([...SSC_BOSSES, ...TK_BOSSES]);

/** True for a boss that belongs to the current live phase (Phase 2). */
function isPhase2Boss(boss: string): boolean {
	return PHASE_2_BOSSES.has(boss);
}

/** A WclFeat is serialized to JSON in the cache; reshape into our Feat type. */
function wclFeatToFeat(f: WclFeat): Feat {
	return {
		boss: f.boss,
		raid: raidForBoss(f.boss),
		date: f.date,
		team: f.team,
		firstKill: f.firstKill
	};
}

/**
 * Fetch WCL data with a D1 cache (key='guild', TTL ~10 min). On fetch error,
 * falls back to stale cache if present, otherwise returns null. The cached
 * payload stores `killedBossNames` as an array (Sets aren't JSON-serializable).
 */
async function loadWclCached(db: Db, env: App.Platform['env']): Promise<WclData | null> {
	const now = Date.now();

	const cachedRow: CacheEntry | null = await getCache(db, WCL_CACHE_KEY);

	const parseRow = (row: CacheEntry): WclData | null => {
		try {
			const parsed = JSON.parse(row.json) as {
				killedBossNames: string[];
				perCore?: Record<string, string[]>;
				perCoreStats?: Record<string, WclCoreStats>;
				feats: WclFeat[];
			};
			// Coerce string keys (JSON object keys) back to numbers.
			const perCore: Record<number, string[]> = {};
			for (const [k, v] of Object.entries(parsed.perCore ?? {})) {
				perCore[Number(k)] = v;
			}
			const perCoreStats: Record<number, WclCoreStats> = {};
			for (const [k, v] of Object.entries(parsed.perCoreStats ?? {})) {
				perCoreStats[Number(k)] = v;
			}
			return {
				killedBossNames: new Set(parsed.killedBossNames),
				perCore,
				perCoreStats,
				feats: parsed.feats
			};
		} catch {
			return null;
		}
	};

	// Fresh enough → use the cached value.
	if (cachedRow && now - cachedRow.fetchedAt < WCL_CACHE_TTL_MS) {
		const fresh = parseRow(cachedRow);
		if (fresh) return fresh;
	}

	// Otherwise fetch live, then upsert the cache.
	const fetched = await getWclData(env);
	if (fetched) {
		const payload = JSON.stringify({
			killedBossNames: [...fetched.killedBossNames],
			perCore: fetched.perCore,
			perCoreStats: fetched.perCoreStats,
			feats: fetched.feats
		});
		await setCache(db, WCL_CACHE_KEY, payload, now);
		return fetched;
	}

	// Fetch failed → use stale cache if we have one.
	if (cachedRow) return parseRow(cachedRow);
	return null;
}

/**
 * Generic D1-cached JSON fetch. Reads `key` from wcl_cache; if fresh (within
 * `ttlMs`) returns the parsed value. Otherwise calls `fetcher`, upserts the
 * result, and returns it. On fetch failure, falls back to stale cache. Fully
 * resilient — never throws (returns null on total failure).
 */
async function loadJsonCached<T>(
	db: Db,
	key: string,
	ttlMs: number,
	fetcher: () => Promise<T | null>
): Promise<T | null> {
	const now = Date.now();

	const cachedRow: CacheEntry | null = await getCache(db, key);

	const parse = (row: CacheEntry): T | null => {
		try {
			return JSON.parse(row.json) as T;
		} catch {
			return null;
		}
	};

	if (cachedRow && now - cachedRow.fetchedAt < ttlMs) {
		const fresh = parse(cachedRow);
		if (fresh) return fresh;
	}

	let fetched: T | null = null;
	try {
		fetched = await fetcher();
	} catch {
		fetched = null;
	}

	if (fetched) {
		await setCache(db, key, JSON.stringify(fetched), now);
		return fetched;
	}

	if (cachedRow) return parse(cachedRow);
	return null;
}

/**
 * Load the report-rankings aggregate (Hall of Fame + reliable character map +
 * per-core rosters) through the shared 12h D1 cache. Returns null when there is
 * no DB binding, no creds, or anything fails — never throws. ONE source of truth
 * for the rankings cache so `loadGuildData` and `loadCoreRoster` share the same
 * cache key/TTL and never trigger a second fetch.
 */
export async function loadWclRankingsCached(
	platform: App.Platform | undefined
): Promise<WclRankings | null> {
	try {
		const binding = platform?.env?.DB;
		if (!binding) return null;
		const db = getDb(binding);
		const env = platform!.env;
		return await loadJsonCached<WclRankings>(db, WCL_HOF_KEY, WCL_HOF_TTL_MS, () =>
			getWclRankings(env)
		);
	} catch {
		return null;
	}
}

/**
 * Load the guild + per-core progress rank (world/region/server) through a ~6h
 * D1 cache. Null on missing binding/creds/error — never throws.
 */
export async function loadWclProgressCached(
	platform: App.Platform | undefined
): Promise<WclProgress | null> {
	try {
		const binding = platform?.env?.DB;
		if (!binding) return null;
		const db = getDb(binding);
		const env = platform!.env;
		return await loadJsonCached<WclProgress>(db, WCL_PROGRESS_KEY, WCL_PROGRESS_TTL_MS, () =>
			getWclProgress(env)
		);
	} catch {
		return null;
	}
}

/**
 * Load per-core attendance (active roster + consistency) through a ~6h D1 cache.
 * Null on missing binding/creds/error — never throws.
 */
export async function loadWclAttendanceCached(
	platform: App.Platform | undefined
): Promise<WclAttendance | null> {
	try {
		const binding = platform?.env?.DB;
		if (!binding) return null;
		const db = getDb(binding);
		const env = platform!.env;
		return await loadJsonCached<WclAttendance>(
			db,
			WCL_ATTENDANCE_KEY,
			WCL_ATTENDANCE_TTL_MS,
			() => getWclAttendance(env)
		);
	} catch {
		return null;
	}
}

/** A single roster member, as derived from recent WCL report rankings. */
export type RosterMember = WclCharacter;

/**
 * Best-effort per-core roster for the given wclGuildId, from the shared 12h
 * rankings cache (no extra fetch beyond what `loadGuildData` already warms).
 *
 * Fully resilient: missing DB / creds / wclGuildId, any error, or a stale cache
 * row lacking `rosters` → null. Empty roster for the core → null.
 */
export async function loadCoreRoster(
	platform: App.Platform | undefined,
	wclGuildId: number | undefined
): Promise<RosterMember[] | null> {
	if (wclGuildId == null) return null;
	try {
		const rankings = await loadWclRankingsCached(platform);
		const roster = rankings?.rosters?.[wclGuildId];
		return roster && roster.length > 0 ? roster : null;
	} catch {
		return null;
	}
}

/**
 * Per-character SSC/TK detail for the internal player page (`/jugador/[name]`),
 * through a per-name 6h D1 cache. Returns null only when we can find NOTHING
 * about the player anywhere — never throws.
 *
 * Two-tier resolution:
 *  1. Rich detail from `characterData.character(...).zoneRankings` — the
 *     authoritative source (per-boss table, all-stars per spec). Cached as a
 *     normal JSON blob in D1.
 *  2. **Synthesized fallback** from the report-rankings cache when (1) returns
 *     null. WCL's per-character endpoint only resolves players that have been
 *     "imported" via Battle.net; on Fresh Classic many players are missing
 *     there but DO appear in our guild's report rankings (which power the Hall
 *     of Fame and per-core rosters). When that happens we synthesize a partial
 *     detail (header + per-boss kills derived from the histórico) instead of
 *     showing the empty "no parses" state — matching what `warcraftlogs.com`
 *     itself renders for these characters.
 *
 * The negative result of (1) is cached too (sentinel `{ __empty: true }`) with
 * the same 6h TTL, so we don't hammer WCL on every page view.
 */
/**
 * The per-character endpoint exposes only `classID`, whose numbering does NOT
 * match WoW's class IDs (it's WCL's internal GameClass id), so the class can come
 * out wrong (e.g. a Combat Rogue shown as "Mago"). The report-rankings cache
 * carries the reliable class STRING (the same source the Hall of Fame uses), so
 * we override the detail's class with it when the player is in rankings — fixing
 * the mislabel AND keeping /jugador coherent with the Hall of Fame. The spec
 * (from zoneRankings, already reliable) is left untouched.
 */
async function enrichDetailClass(
	platform: App.Platform | undefined,
	detail: WclCharacterDetail | null
): Promise<WclCharacterDetail | null> {
	if (!detail) return detail;
	try {
		const rankings = await loadWclRankingsCached(platform);
		const ch = rankings?.characters?.[detail.name.toLowerCase()];
		if (ch?.wowClass) {
			return {
				...detail,
				wowClass: ch.wowClass,
				classLabel: ch.classLabel ?? detail.classLabel,
				classColor: CLASS_COLOR[ch.wowClass] ?? detail.classColor
			};
		}
	} catch {
		// Best-effort enrichment; keep the original detail on any failure.
	}
	return detail;
}

export async function loadWclCharacterCached(
	platform: App.Platform | undefined,
	name: string
): Promise<WclCharacterDetail | null> {
	try {
		const binding = platform?.env?.DB;
		if (!binding || !name.trim()) return null;
		const db = getDb(binding);
		const env = platform!.env;
		const key = 'char_v6:' + name.toLowerCase();
		const now = Date.now();

		const cachedRow = await getCache(db, key);
		if (cachedRow && now - cachedRow.fetchedAt < WCL_CHARACTER_TTL_MS) {
			try {
				const parsed = JSON.parse(cachedRow.json) as
					| WclCharacterDetail
					| { __empty: true };
				if ((parsed as { __empty?: true }).__empty) {
					// Synthesized detail already uses the reliable rankings class.
					return await synthesizePlayerDetailFromRankings(platform, name);
				}
				return await enrichDetailClass(platform, parsed as WclCharacterDetail);
			} catch {
				// Corrupt row → fall through and re-fetch.
			}
		}

		const detail = await getWclCharacter(env, name);
		if (detail) {
			await setCache(db, key, JSON.stringify(detail), now);
			return await enrichDetailClass(platform, detail);
		}

		// Per-character endpoint missed — negative-cache the miss so we don't
		// hammer WCL, then synthesize from the shared rankings cache.
		await setCache(db, key, JSON.stringify({ __empty: true }), now);
		return await synthesizePlayerDetailFromRankings(platform, name);
	} catch {
		return null;
	}
}

/**
 * Build a partial `WclCharacterDetail` for a player that's absent from the
 * per-character endpoint but present in our shared report-rankings cache.
 *
 * Fills the hero header (name, class, spec, role, best score) from
 * `rankings.characters[name]` and reconstructs a per-boss table by aggregating
 * the player's recent kills (count, best parse). All-stars + median + ranks +
 * amount/ilvl/fastestKill are unavailable in this source and therefore left
 * empty; the page handles those gracefully (sections render only when they
 * have data). Returns null only when the player isn't in rankings either.
 */
async function synthesizePlayerDetailFromRankings(
	platform: App.Platform | undefined,
	name: string
): Promise<WclCharacterDetail | null> {
	try {
		const rankings = await loadWclRankingsCached(platform);
		if (!rankings) return null;

		const key = name.toLowerCase();
		const ch = rankings.characters?.[key];
		const recent = rankings.recentByPlayer?.[key] ?? [];
		if (!ch && recent.length === 0) return null;

		const wowClass = ch?.wowClass ?? null;

		const bossMap = new Map<string, WclBossDetail>();
		for (const k of recent) {
			const existing = bossMap.get(k.boss);
			if (!existing) {
				bossMap.set(k.boss, {
					encounterName: k.boss,
					best: k.parse,
					median: null,
					kills: 1,
					amount: null,
					ilvl: null,
					fastestKillMs: null,
					spec: ch?.spec ?? null
				});
			} else {
				existing.kills += 1;
				if (k.parse != null && (existing.best ?? -1) < k.parse) existing.best = k.parse;
			}
		}
		const bosses = [...bossMap.values()].sort(
			(a, b) => (b.best ?? -1) - (a.best ?? -1) || b.kills - a.kills
		);

		return {
			name: ch?.name ?? name,
			wowClass,
			classLabel: ch?.classLabel ?? null,
			classColor: wowClass ? CLASS_COLOR[wowClass] : null,
			mainSpec: ch?.spec ?? null,
			role: ch?.specRole ?? 'DPS',
			metric: null,
			bestAvg: ch?.score ?? 0,
			median: 0,
			bestRanks: { world: null, region: null, server: null },
			allStars: [],
			bosses
		};
	} catch {
		return null;
	}
}

/**
 * The player's recent-kills histórico, read straight from the shared rankings
 * cache (`recentByPlayer`) — no extra fetch beyond what the Hall of Fame already
 * warms. Resilient: missing DB / creds / stale cache row lacking the field → [].
 */
export async function loadPlayerRecentKills(
	platform: App.Platform | undefined,
	name: string
): Promise<WclRecentKill[]> {
	try {
		if (!name.trim()) return [];
		const rankings = await loadWclRankingsCached(platform);
		return rankings?.recentByPlayer?.[name.toLowerCase()] ?? [];
	} catch {
		return [];
	}
}

/** A player's standing within the guild's ranked roster (server-computed). */
export type PlayerStanding = {
	/** Rank by score across all ranked players (1-based) + the total pool. */
	overall: { rank: number; total: number } | null;
	/** Rank by score within the player's class + that class's total. */
	inClass: { rank: number; total: number } | null;
};

/**
 * Compute a player's standing (overall + within-class rank) from the shared
 * rankings cache. This is a derivation the CLIENT can't do — the /jugador page
 * only has that one player's data, not the whole ranked roster — so it's done
 * server-side off the same cache the Hall of Fame uses (coherent scores). Null
 * when the player isn't in the ranked roster.
 */
export async function loadPlayerStanding(
	platform: App.Platform | undefined,
	name: string
): Promise<PlayerStanding | null> {
	try {
		if (!name.trim()) return null;
		const rankings = await loadWclRankingsCached(platform);
		const characters = rankings?.characters;
		if (!characters) return null;

		const key = name.toLowerCase();
		const me = characters[key];
		if (!me || me.score == null) return null;

		const all = Object.values(characters).filter(
			(c): c is WclCharacter & { score: number } => typeof c.score === 'number'
		);
		const overallRank =
			all.slice().sort((a, b) => b.score - a.score).findIndex((c) => c.name.toLowerCase() === key) +
			1;

		let inClass: PlayerStanding['inClass'] = null;
		if (me.wowClass) {
			const peers = all
				.filter((c) => c.wowClass === me.wowClass)
				.sort((a, b) => b.score - a.score);
			const r = peers.findIndex((c) => c.name.toLowerCase() === key) + 1;
			if (r > 0) inClass = { rank: r, total: peers.length };
		}

		return {
			overall: overallRank > 0 ? { rank: overallRank, total: all.length } : null,
			inClass
		};
	} catch {
		return null;
	}
}

/**
 * Merge WCL enrichment into the base officers, preferring the RELIABLE source.
 *
 * Priority per officer (matched case-insensitively by name):
 *  1. Report-rankings map (`reliable`, keyed lowercase): the class/spec/role the
 *     player ACTUALLY played that night, plus the parse score. This is the
 *     trustworthy source for spec in Fresh TBC.
 *  2. Class-only fallback (`classOnly`, from a classID lookup): fills
 *     class/classLabel/score but leaves spec EMPTY (rather than a noisy one).
 *  3. Officers found in neither stay name + role only.
 *
 * In all cases a class already set in D1 wins over a derived one.
 */
function mergeOfficerWcl(
	officers: Officer[],
	reliable: Record<string, WclCharacter>,
	classOnly: Record<string, WclCharacter>
): Officer[] {
	return officers.map((o) => {
		const ch = reliable[o.name.toLowerCase()];
		if (ch) {
			return {
				...o,
				// Prefer WCL class when D1 didn't already provide one.
				wowClass: o.wowClass ?? ch.wowClass,
				classLabel: o.classLabel ?? ch.classLabel,
				spec: ch.spec,
				specRole: ch.specRole,
				score: ch.score
			};
		}
		// Fallback: class-only (reliable classID), but no (noisy) spec.
		const fb = classOnly[o.name];
		if (fb) {
			return {
				...o,
				wowClass: o.wowClass ?? fb.wowClass,
				classLabel: o.classLabel ?? fb.classLabel,
				spec: undefined,
				specRole: undefined,
				score: fb.score
			};
		}
		return o;
	});
}

/**
 * Apply live WCL data on top of the base phases/feats:
 *  - Progress: every Phase 2 (SSC/TK) boss gets `defeated` from the union of
 *    killed bosses across cores; raid + phase percentages recomputed.
 *  - Feats: replaced by the WCL-derived feats (mapped to the Feat shape).
 * Returns the (possibly) overridden phases + feats. Never throws.
 */
function applyWclOverride(
	phases: Phase[],
	feats: Feat[],
	wcl: WclData
): { phases: Phase[]; feats: Feat[] } {
	const phase2Ids = new Set(['phase-2']);

	const nextPhases = phases.map((phase) => {
		if (!phase2Ids.has(phase.id)) return phase;
		const raids = phase.raids.map((raid) => {
			const bosses: Boss[] = raid.bosses.map((b) => ({
				name: b.name,
				defeated: wcl.killedBossNames.has(b.name)
			}));
			return withRaidProgress(raid.id, raid.name, bosses, raid.abbr);
		});
		return { ...phase, raids, percent: phasePercent(raids) };
	});

	// Only Phase 2 (SSC/TK) feats are "live" — drop Phase 1 farm kills (Karazhan /
	// Gruul / Magtheridon) so they don't appear in Últimas hazañas or skew stats.
	const nextFeats = wcl.feats.filter((f) => isPhase2Boss(f.boss)).map(wclFeatToFeat);

	return { phases: nextPhases, feats: nextFeats.length > 0 ? nextFeats : feats };
}

/** Round a raid progress to a 0–100 percent (server-side, so the client doesn't). */
function progressPercent(p: { kills: number; total: number }): number {
	return p.total === 0 ? 0 : Math.round((p.kills / p.total) * 100);
}

/**
 * Fill each team's SSC/TK `percent` server-side so the client renders it directly
 * (no `Math.round` in the component). Applied at every point teams reach the
 * client, including the static fallback.
 */
function withTeamPercents(teams: Team[]): Team[] {
	return teams.map((team) => ({
		...team,
		ssc: { ...team.ssc, percent: progressPercent(team.ssc) },
		tk: { ...team.tk, percent: progressPercent(team.tk) }
	}));
}

/**
 * Override each team's SSC/TK kill counts from its OWN WCL core data. A team is
 * only overridden when its wclGuildId is present in `wcl.perCore` (i.e. WCL
 * returned data for that core); otherwise the manual D1 value is kept.
 */
function applyTeamWclOverride(teams: Team[], wcl: WclData): Team[] {
	return teams.map((team) => {
		if (team.wclGuildId == null) return team;
		const killed = wcl.perCore[team.wclGuildId];
		if (!killed) return team; // No WCL data for this core → keep manual.
		const sscKills = killed.filter((b) => SSC_BOSSES.has(b)).length;
		const tkKills = killed.filter((b) => TK_BOSSES.has(b)).length;
		return {
			...team,
			ssc: { kills: sscKills, total: SSC_TOTAL },
			tk: { kills: tkKills, total: TK_TOTAL }
		};
	});
}

/**
 * Compute guild-wide stats. Derived from the (already WCL-overridden) phases,
 * feats and teams — so it works whether or not WCL was available. Pass the
 * runtime `now` (ms) so module scope stays free of Date.now.
 */
function computeStats(
	phases: Phase[],
	feats: Feat[],
	teams: Team[],
	now: number
): GuildStats {
	// Phase 2 bosses down (union across cores) from the phase-2 raids.
	const phase2 = phases.find((p) => p.id === 'phase-2');
	const phase2BossesDown = phase2
		? phase2.raids.reduce((acc, r) => acc + r.kills, 0)
		: 0;
	const phase2BossesTotal = SSC_TOTAL + TK_TOTAL;

	const activeCores = teams.length;

	// Most recent feat (feats are newest-first, but sort defensively by date).
	const sortedFeats = [...feats].sort((a, b) =>
		a.date < b.date ? 1 : a.date > b.date ? -1 : 0
	);
	const newest = sortedFeats[0] ?? null;
	const lastFeat = newest
		? { boss: newest.boss, date: newest.date, team: newest.team }
		: null;

	// Kills within 30 days of the newest feat date (avoid drifting on stale data).
	let killsLast30Days = 0;
	if (newest) {
		const newestMs = Date.parse(newest.date);
		const ref = Number.isNaN(newestMs) ? now : newestMs;
		const cutoff = ref - 30 * 24 * 60 * 60 * 1000;
		killsLast30Days = sortedFeats.filter((f) => {
			const ms = Date.parse(f.date);
			return !Number.isNaN(ms) && ms >= cutoff;
		}).length;
	}

	// Top core by SSC+TK kills.
	let topCore: GuildStats['topCore'] = null;
	let fullClearCores = 0;
	for (const t of teams) {
		const kills = t.ssc.kills + t.tk.kills;
		if (!topCore || kills > topCore.kills) topCore = { name: t.name, kills };
		if (t.ssc.kills >= SSC_TOTAL && t.tk.kills >= TK_TOTAL) fullClearCores++;
	}
	if (topCore && topCore.kills === 0) topCore = null;

	return {
		phase2BossesDown,
		phase2BossesTotal,
		activeCores,
		lastFeat,
		killsLast30Days,
		topCore,
		fullClearCores
	};
}

/**
 * Load all guild data. Uses D1 (via Drizzle repositories) when the binding is
 * present; otherwise (or on any error) returns the static fallback from
 * `$lib/data/*`.
 */
export async function loadGuildData(
	platform: App.Platform | undefined
): Promise<GuildData> {
	const binding = platform?.env?.DB;
	if (!binding) return staticFallback();

	try {
		const env = platform!.env;
		const db = getDb(binding);

		const [guild, phases, teams, officers, recruitment, feats, faq, communityMeta, raidNights] =
			await Promise.all([
				getGuild(db),
				getPhases(db),
				getTeams(db),
				getOfficers(db),
				getRecruitment(db),
				getFeats(db),
				getFaq(db),
				getCommunityMeta(db),
				getRaidNights(db)
			]);

		// Missing singleton rows → treat as "no data yet" and fall back.
		if (!guild || !recruitment || !communityMeta) return staticFallback();

		// ── Community (discordInvite mirrors the recruitment Discord URL) ──
		const community = {
			discordServerId: communityMeta.discordServerId,
			discordInvite: recruitment.discordUrl,
			raidTimezone: communityMeta.raidTimezone,
			raidNights
		};

		// ── WarcraftLogs live override (cached, resilient) ──
		// Attempt to derive Phase 2 progress, per-core progress + recent feats from
		// the guild's WCL logs. Any failure leaves the manual D1 data untouched.
		let outPhases = phases;
		let outFeats = feats;
		let outTeams = teams;
		try {
			const wcl = await loadWclCached(db, env);
			if (wcl) {
				const overridden = applyWclOverride(phases, feats, wcl);
				outPhases = overridden.phases;
				outFeats = overridden.feats;
				outTeams = applyTeamWclOverride(teams, wcl);
			}
		} catch {
			// Keep the manual progress + feats + teams on any WCL error.
		}

		// Report rankings — ONE cached fetch (~12h) feeds BOTH the Hall of Fame
		// and reliable officer spec enrichment (best parse per character, with the
		// class/spec/role they actually played).
		let hallOfFame: HallOfFame | null = null;
		let reliableChars: Record<string, WclCharacter> = {};
		try {
			const rankings = await loadWclRankingsCached(platform);
			// Guard against a stale cache row from the old (HallOfFame-only) shape.
			if (rankings && rankings.hallOfFame) {
				hallOfFame = rankings.hallOfFame;
				reliableChars = rankings.characters ?? {};
			}
		} catch {
			hallOfFame = null;
		}

		// Officer enrichment: reliable spec from the rankings map above, with a
		// class-only fallback (classID lookup, cached ~6h) for officers absent from
		// the rankings — so they at least get a class, but no noisy spec.
		let outOfficers = officers;
		try {
			let classOnly: Record<string, WclCharacter> = {};
			// Only spend the extra (cheap) classID call when an officer is missing
			// from the reliable rankings map.
			const needFallback = officers.some((o) => !reliableChars[o.name.toLowerCase()]);
			if (needFallback) {
				const enrich = await loadJsonCached<Record<string, WclCharacter>>(
					db,
					WCL_OFFICERS_KEY,
					WCL_OFFICERS_TTL_MS,
					() => getWclOfficers(env)
				);
				if (enrich) classOnly = enrich;
			}
			outOfficers = mergeOfficerWcl(officers, reliableChars, classOnly);
		} catch {
			// Keep base officers (name + role) on any failure.
		}

		// Stats are derived from whatever data we ended up with (WCL or manual).
		const stats = computeStats(outPhases, outFeats, outTeams, Date.now());

		return {
			guild,
			phases: outPhases,
			officers: outOfficers,
			recruitment,
			teams: withTeamPercents(outTeams),
			feats: outFeats,
			faq,
			stats,
			hallOfFame,
			community
		};
	} catch {
		return staticFallback();
	}
}
