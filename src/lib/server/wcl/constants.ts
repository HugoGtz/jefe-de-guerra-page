/**
 * Config + WoW class/spec mapping tables for the WCL integration. Every
 * "how far back do we look" window lives here with its rationale documented
 * inline — see the note above `HOF_REPORTS_PER_CORE` for the one distinction
 * that matters most: which windows are an intentional "recent activity" view
 * vs. `bossKills.ts`'s progression data, which is persisted permanently in
 * `wcl-boss-ledger.ts` precisely because it must NOT reset when a report ages
 * out of a window.
 */

import type { WowClass, SpecRole } from '$lib/data/officers';

export const OAUTH_URL = 'https://www.warcraftlogs.com/oauth/token';
export const GRAPHQL_URL = 'https://fresh.warcraftlogs.com/api/v2/client';

/**
 * Reports fetched per guild per query for boss-kill progress (`bossKills.ts`).
 * This is a raw fetch window, NOT the source of truth for "has this core ever
 * killed boss X" — that's answered by the persisted ledger in
 * `wcl-boss-ledger.ts`, which unions every fetch's results forever. This
 * constant only controls how far back a single fetch looks for NEW kills to
 * add to the ledger, and how much "Últimas hazañas"/activity-stats history is
 * visible in one pass.
 */
export const REPORTS_PER_GUILD = 25;

/** Max feats returned (most recent first-kills/kills). */
export const MAX_FEATS = 10;

/** SSC/TK zone used for all character rankings. */
export const SSC_TK_ZONE_ID = 1056;

/**
 * Partition for character zoneRankings. SSC/TK (1056) has P1 (id 1) and P2
 * (id 2, the WCL default). `-1` aggregates ALL partitions so a character's
 * best parse is captured regardless of the Fresh phase it happened in (the
 * default would silently show only the latest partition). Set to a specific
 * id to scope to one phase.
 */
export const WCL_PARTITION = -1;

/** Server slug / region for every character lookup. */
export const SERVER_SLUG = 'dreamscythe';
export const SERVER_REGION = 'us';

/** Top N per role/class/boss surfaced in the Hall of Fame and leaderboards. */
export const HOF_TOP_N = 10;

/**
 * Reports per core to pull rankings from for Hall of Fame / rosters / per-class
 * & per-boss leaderboards / player histórico. Kept low — each report is one
 * inner batched fight set — but enough to cover the active roster across
 * SSC/TK.
 *
 * INTENTIONAL recency window, NOT a candidate for the boss-kill persistence
 * pattern (`wcl-boss-ledger.ts`): who's actively raiding/parsing right now is
 * SUPPOSED to reflect recent activity — a player who stopped raiding months
 * ago should fall out of the roster/Hall of Fame, not be pinned there forever.
 */
export const HOF_REPORTS_PER_CORE = 4;

/**
 * Recent attendance reports per core to consider for `attendance.ts`.
 *
 * Same INTENTIONAL recency window as `HOF_REPORTS_PER_CORE` above — attendance
 * consistency is inherently about recent raids, never persisted.
 */
export const ATTENDANCE_REPORTS = 10;

/** Max recent kills kept per player in the histórico. */
export const MAX_RECENT_PER_PLAYER = 12;

/** Chunk size for the batched zoneRankings roster fetch (expensive scalar). */
export const ZONE_SCORE_CHUNK = 20;

/** Raid size for SSC/TK (25-man) — required by zoneRanking. */
export const RAID_SIZE = 25;

// ── TBC class IDs → English class + Spanish label ────────────────────────────

/** WCL/Blizzard classID → our internal WowClass (TBC class set). */
export const CLASS_ID_TO_CLASS: Record<number, WowClass> = {
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
export const CLASS_LABEL_ES: Record<WowClass, string> = {
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

/** English class name (as it comes from report rankings) → our WowClass. */
export const CLASS_NAME_TO_CLASS: Record<string, WowClass> = {
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
export function roleForSpec(spec: string | null | undefined): SpecRole {
	if (!spec) return 'DPS';
	return SPEC_TO_ROLE[spec] ?? 'DPS';
}

export function classLabelEs(wowClass: WowClass): string {
	return CLASS_LABEL_ES[wowClass];
}

export function toIsoDate(epochMs: number): string {
	return new Date(epochMs).toISOString().slice(0, 10);
}
