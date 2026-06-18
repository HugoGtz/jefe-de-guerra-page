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
	type WclData,
	type WclFeat,
	type WclCharacter,
	type HallOfFame,
	type WclRankings
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
		teams: staticTeams,
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

/** Officer enrichment (class/spec/score) — expensive, long TTL (~6h). */
const WCL_OFFICERS_TTL_MS = 6 * 60 * 60 * 1000;
const WCL_OFFICERS_KEY = 'officers';

/**
 * Report rankings (per-core roster + parses) — heaviest, longest TTL (~12h).
 * ONE fetch feeds BOTH the Hall of Fame and reliable officer spec enrichment.
 */
const WCL_HOF_TTL_MS = 12 * 60 * 60 * 1000;
const WCL_HOF_KEY = 'hall_of_fame';

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
				feats: WclFeat[];
			};
			// Coerce string keys (JSON object keys) back to numbers.
			const perCore: Record<number, string[]> = {};
			for (const [k, v] of Object.entries(parsed.perCore ?? {})) {
				perCore[Number(k)] = v;
			}
			return {
				killedBossNames: new Set(parsed.killedBossNames),
				perCore,
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

	const nextFeats = wcl.feats.map(wclFeatToFeat);

	return { phases: nextPhases, feats: nextFeats.length > 0 ? nextFeats : feats };
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
			const rankings = await loadJsonCached<WclRankings>(
				db,
				WCL_HOF_KEY,
				WCL_HOF_TTL_MS,
				() => getWclRankings(env)
			);
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
			teams: outTeams,
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
