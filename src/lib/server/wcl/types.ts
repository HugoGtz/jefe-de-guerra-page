/**
 * Shared types for the WarcraftLogs (WCL) integration. No I/O, no D1 — pure
 * shape definitions used across `wcl/*` and re-exported (selectively) via
 * `wcl/index.ts` for `data.ts` and components.
 */

import type { WowClass, SpecRole } from '$lib/data/officers';

export type WclEnv = {
	WCL_CLIENT_ID?: string;
	WCL_CLIENT_SECRET?: string;
};

/**
 * The guild's logs are FRAGMENTED across two WCL representations:
 *  - Most cores upload to their OWN guild object (`wclGuildId`, e.g. 826903).
 *  - Some cores (e.g. Core 4) instead upload to the PARENT guild "Jefe de Guerra"
 *    (792187) under their raid-team TAG (`wclTagId`); their own guild object is
 *    then empty.
 * No single source holds everything, so the global queries pull the parent PLUS
 * every core guild object, and attribute each report to its core via `resolveCore`
 * (by source for core guilds; by `guildTag` for parent reports). See
 * `wcl/core-attribution.ts`.
 */
export type WclSource = { wclGuildId: number; name: string; isParent?: boolean };

/** A report's owning raid-team tag (only populated on the parent guild's reports). */
export type GuildTag = { id?: number | null; name?: string | null } | null;

// ── Character-level shapes (officer enrichment + Hall of Fame) ───────────────

/** A single character's WCL-derived class/spec/score. */
export type WclCharacter = {
	name: string;
	wowClass?: WowClass;
	classLabel?: string;
	/** Hex class color, populated on the `characters` map (per-class leaderboard); absent on rosters/officer enrichment paths that don't set it. */
	classColor?: string;
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

/** World/region/server rank numbers for a guild's zone progress. */
export type WclRankTriple = { world: number | null; region: number | null; server: number | null };

export type WclProgress = {
	/** Whole-guild ("Jefe de Guerra") progress rank in SSC/TK, or null. */
	guild: WclRankTriple | null;
	/** wclGuildId → that core's OWN guild-object progress rank (only when ranked). */
	perCore: Record<number, WclRankTriple>;
	/** Whole-guild speed rank (fastest kills) in SSC/TK, or null. */
	guildSpeed: WclRankTriple | null;
	/** wclGuildId → that core's OWN guild-object speed rank (only when ranked). */
	perCoreSpeed: Record<number, WclRankTriple>;
};

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

/** Live API quota state, from the top-level `rateLimitData` query. */
export type WclRateLimit = {
	limitPerHour: number;
	pointsSpentThisHour: number;
	pointsResetIn: number;
};

/** One of a character's recent reports (any guild, any zone) — recruitment
 *  screening: "has this applicant actually been raiding lately?" */
export type WclRecentReport = {
	code: string;
	/** Epoch ms. */
	startTime: number;
	/** Zone/instance name (e.g. "SSC / TK", "Karazhan"), or null if unknown. */
	zoneName: string | null;
};
