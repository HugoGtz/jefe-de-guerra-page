/**
 * Persisted "ever killed" boss-progression ledger — the fix for the sliding-
 * window regression: `wcl/bossKills.ts`'s `getWclData()` only looks at each
 * core's most-recent reports, so a real kill can silently disappear from the
 * live result once its report ages out of that window. This module is the
 * union policy that makes the DISPLAYED count monotonic regardless: every
 * live fetch's Phase-2 kills get upserted into `wcl_boss_kills` (additive,
 * never overwritten wholesale — see `wclBossKills.repository.ts`), and the
 * value shown on the site is always `persisted ∪ this fetch's live result`,
 * never live alone.
 *
 * This is D1-orchestration policy (not GraphQL fetching), so it lives here
 * next to `data.ts`/`cache.ts` rather than inside `wcl/*`.
 */

import type { WclData } from '$lib/server/wcl';
import type { BossKillRow } from './repositories/wclBossKills.repository';

/**
 * Current raid tier the ledger tracks. Bump this (and see DEPLOY.md for the
 * manual cleanup command) when a new raid tier opens — old-tier rows are
 * simply excluded from `getBossKills`'s `WHERE tier = ?`, no migration needed.
 */
export const CURRENT_TIER = 'p2-ssc-tk';

/**
 * Flatten a live fetch's `perCore` into (core, boss) pairs to persist, scoped
 * to `relevantBosses` (the caller passes the current tier's boss set) so the
 * ledger never accumulates Phase-1 farm content (Karazhan/Gruul/Magtheridon)
 * under a Phase-2 tier.
 */
export function pairsFromLive(
	live: WclData,
	relevantBosses: Set<string>
): { coreWclGuildId: number; boss: string }[] {
	const out: { coreWclGuildId: number; boss: string }[] = [];
	for (const [idStr, bosses] of Object.entries(live.perCore)) {
		const coreWclGuildId = Number(idStr);
		for (const boss of bosses) {
			if (relevantBosses.has(boss)) out.push({ coreWclGuildId, boss });
		}
	}
	return out;
}

/**
 * Union the persisted ledger with this fetch's live result. Never subtracts —
 * a boss present in EITHER source counts as killed. Returns empty structures
 * (not null) when both are empty; the caller decides what "nothing to show"
 * means for its own fallback policy.
 */
export function mergeLedger(
	persisted: BossKillRow[],
	live: WclData | null
): { perCore: Record<number, string[]>; killedBossNames: Set<string> } {
	const sets = new Map<number, Set<string>>();
	const add = (id: number, boss: string) => {
		let s = sets.get(id);
		if (!s) {
			s = new Set<string>();
			sets.set(id, s);
		}
		s.add(boss);
	};

	for (const row of persisted) add(row.coreWclGuildId, row.boss);
	if (live) {
		for (const [idStr, bosses] of Object.entries(live.perCore)) {
			const id = Number(idStr);
			for (const boss of bosses) add(id, boss);
		}
	}

	const perCore: Record<number, string[]> = {};
	const killedBossNames = new Set<string>();
	for (const [id, s] of sets) {
		perCore[id] = [...s];
		for (const b of s) killedBossNames.add(b);
	}
	return { perCore, killedBossNames };
}
