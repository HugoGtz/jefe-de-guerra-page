/**
 * Raid progression repository. Reads phases + raids + bosses and assembles the
 * nested `Phase[]` domain model, recomputing per-raid kills/total/percent and
 * per-phase percentages (mirrors the derived values in `$lib/data/raids`).
 */

import { asc } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { phases, raids, bosses } from '$lib/server/db/schema';
import type { Phase, Raid, Boss } from '$lib/data/raids';

/** Recompute kills/total/percent for a raid from its bosses. */
export function withRaidProgress(
	id: string,
	name: string,
	raidBosses: Boss[],
	abbr?: string
): Raid {
	const total = raidBosses.length;
	const kills = raidBosses.filter((b) => b.defeated).length;
	const percent = total === 0 ? 0 : Math.round((kills / total) * 100);
	return { id, name, abbr, bosses: raidBosses, kills, total, percent };
}

/** Global phase percent = bosses killed / total across its raids. */
export function phasePercent(phaseRaids: Raid[]): number {
	const total = phaseRaids.reduce((acc, r) => acc + r.total, 0);
	const kills = phaseRaids.reduce((acc, r) => acc + r.kills, 0);
	return total === 0 ? 0 : Math.round((kills / total) * 100);
}

/**
 * Load every phase with its raids and bosses, progress recomputed. Returns an
 * empty array when there are no phases.
 */
export async function getPhases(db: Db): Promise<Phase[]> {
	const [phaseRows, raidRows, bossRows] = await Promise.all([
		db.select().from(phases).orderBy(asc(phases.sort)).all(),
		db.select().from(raids).orderBy(asc(raids.sort)).all(),
		db.select().from(bosses).orderBy(asc(bosses.sort)).all()
	]);

	const bossesByRaid = new Map<string, Boss[]>();
	for (const b of bossRows) {
		const list = bossesByRaid.get(b.raidId) ?? [];
		list.push({ name: b.name, defeated: b.defeated === 1 });
		bossesByRaid.set(b.raidId, list);
	}

	const raidsByPhase = new Map<string, Raid[]>();
	for (const r of raidRows) {
		const raid = withRaidProgress(
			r.id,
			r.name,
			bossesByRaid.get(r.id) ?? [],
			r.abbr ?? undefined
		);
		const list = raidsByPhase.get(r.phaseId) ?? [];
		list.push(raid);
		raidsByPhase.set(r.phaseId, list);
	}

	return phaseRows.map((p) => {
		const phaseRaids = raidsByPhase.get(p.id) ?? [];
		return {
			id: p.id,
			name: p.name,
			label: p.label,
			status: p.status as Phase['status'],
			statusLabel: p.statusLabel,
			percent: phasePercent(phaseRaids),
			raids: phaseRaids
		};
	});
}
