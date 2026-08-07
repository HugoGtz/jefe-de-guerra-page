/**
 * WarcraftLogs API integration (server-only) — public barrel.
 *
 * Derives the guild's live raid progress, roster, Hall of Fame, attendance and
 * per-character detail from the WCL logs of the 7 Cores (parent guild "Jefe de
 * Guerra", Fresh/Anniversary Classic). See `core-attribution.ts` for how the
 * guild's fragmented logs (some cores log to their own guild object, others to
 * the parent under a raid-team tag) are reconciled.
 *
 * Everything here is resilient: missing creds or any error → returns `null` so
 * the caller (`$lib/server/data.ts`) falls back to the manual D1/static data.
 * No top-level side effects; all network/Date use happens inside the functions
 * (SSR runtime only).
 *
 * This is the ONLY import path other modules should use — internal files
 * (`bossKills.ts`, `rankings/*`, etc.) are implementation detail.
 */

/** Re-export so the WCL layer can offer it too; the impl lives in the shared
    (non-server) parse module so components can import it directly. */
export { formatDuration } from '$lib/parse';

export { CLASS_COLOR, classLabelEs } from './constants';
export { logWclEvent } from './logging';

export { getWclData } from './bossKills';
export { getWclOfficers } from './officers';
export { getWclCharacter } from './character';
export { getWclRankings } from './rankings/index';
export { getWclProgress } from './progress';
export { getWclAttendance } from './attendance';

export type {
	WclEnv,
	WclSource,
	GuildTag,
	WclCharacter,
	WclAllStarsEntry,
	WclBossDetail,
	WclCharacterDetail,
	HallOfFameEntry,
	HallOfFame,
	BossLeaderEntry,
	WclRecentKill,
	WclRankings,
	WclFeat,
	WclCoreStats,
	WclData,
	WclRankTriple,
	WclProgress,
	WclAttendee,
	WclAttendance
} from './types';
