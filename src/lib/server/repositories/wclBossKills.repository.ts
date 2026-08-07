/**
 * Boss-kill ledger repository. Thin typed wrapper over the `wcl_boss_kills`
 * table (core+boss+tier → first/last seen). The orchestrator (`wcl-boss-ledger.ts`)
 * owns the union-with-live-data policy and the current tier; this repo only
 * does the read and the additive upsert.
 *
 * Same best-effort convention as `wclCache.repository.ts`: any read/write
 * failure is swallowed (never throws) so a ledger problem never breaks the page.
 */

import { and, eq } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { wclBossKills } from '$lib/server/db/schema';

export type BossKillRow = {
	coreWclGuildId: number;
	boss: string;
	tier: string;
	firstSeenAt: number;
	lastSeenAt: number;
};

/** Every confirmed kill for the given tier. Best-effort: any error → []. */
export async function getBossKills(db: Db, tier: string): Promise<BossKillRow[]> {
	try {
		return await db.select().from(wclBossKills).where(eq(wclBossKills.tier, tier)).all();
	} catch {
		return [];
	}
}

/**
 * Upsert newly-observed core+boss kills for the given tier (one round trip).
 * `firstSeenAt` is set only on insert; a conflict only bumps `lastSeenAt` — the
 * ledger is additive, it never forgets a kill once confirmed. Best-effort:
 * never throws — a write failure must not fail the page.
 */
export async function upsertBossKills(
	db: Db,
	tier: string,
	pairs: { coreWclGuildId: number; boss: string }[],
	now: number
): Promise<void> {
	if (pairs.length === 0) return;
	try {
		await db
			.insert(wclBossKills)
			.values(pairs.map((p) => ({ ...p, tier, firstSeenAt: now, lastSeenAt: now })))
			.onConflictDoUpdate({
				target: [wclBossKills.coreWclGuildId, wclBossKills.boss, wclBossKills.tier],
				set: { lastSeenAt: now }
			});
	} catch {
		// Best-effort ledger write; ignore failures.
	}
}

/** Remove one ledger row (admin correction of a bad entry). Best-effort: never throws. */
export async function deleteBossKill(
	db: Db,
	coreWclGuildId: number,
	boss: string,
	tier: string
): Promise<void> {
	try {
		await db
			.delete(wclBossKills)
			.where(
				and(
					eq(wclBossKills.coreWclGuildId, coreWclGuildId),
					eq(wclBossKills.boss, boss),
					eq(wclBossKills.tier, tier)
				)
			);
	} catch {
		// Best-effort; ignore failures.
	}
}
