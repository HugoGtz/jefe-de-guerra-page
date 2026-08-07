/**
 * Raid progression repository. Reads phases + raids + bosses and assembles the
 * nested `Phase[]` domain model, recomputing per-raid kills/total/percent and
 * per-phase percentages (mirrors the derived values in `$lib/data/raids`).
 */

import { asc, eq } from 'drizzle-orm';
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
		const raid = withRaidProgress(r.id, r.name, bossesByRaid.get(r.id) ?? [], r.abbr ?? undefined);
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

// ── Admin (edit-only: no add/delete of phases or raids from the panel — a new
// raid tier is a couple-times-a-year event, documented as a manual SQL step in
// DEPLOY.md, same pattern as the WCL boss-kill ledger's tier rotation) ────────

/** A boss with its DB id, for the admin editor. */
export type BossAdmin = { id: number; name: string; defeated: boolean; sort: number };
/** A raid with its DB id + admin bosses, for the admin editor. */
export type RaidAdmin = {
	id: string;
	name: string;
	abbr: string | null;
	sort: number;
	bosses: BossAdmin[];
};
/** A phase with its DB id + admin raids, for the admin editor. */
export type PhaseAdmin = {
	id: string;
	name: string;
	label: string;
	status: Phase['status'];
	statusLabel: string;
	sort: number;
	raids: RaidAdmin[];
};

/** Load every phase/raid/boss WITH their DB ids for the admin editor. */
export async function listPhasesAdmin(db: Db): Promise<PhaseAdmin[]> {
	const [phaseRows, raidRows, bossRows] = await Promise.all([
		db.select().from(phases).orderBy(asc(phases.sort)).all(),
		db.select().from(raids).orderBy(asc(raids.sort)).all(),
		db.select().from(bosses).orderBy(asc(bosses.sort)).all()
	]);

	const bossesByRaid = new Map<string, BossAdmin[]>();
	for (const b of bossRows) {
		const list = bossesByRaid.get(b.raidId) ?? [];
		list.push({ id: b.id, name: b.name, defeated: b.defeated === 1, sort: b.sort });
		bossesByRaid.set(b.raidId, list);
	}

	const raidsByPhase = new Map<string, RaidAdmin[]>();
	for (const r of raidRows) {
		const list = raidsByPhase.get(r.phaseId) ?? [];
		list.push({
			id: r.id,
			name: r.name,
			abbr: r.abbr,
			sort: r.sort,
			bosses: bossesByRaid.get(r.id) ?? []
		});
		raidsByPhase.set(r.phaseId, list);
	}

	return phaseRows.map((p) => ({
		id: p.id,
		name: p.name,
		label: p.label,
		status: p.status as Phase['status'],
		statusLabel: p.statusLabel,
		sort: p.sort,
		raids: raidsByPhase.get(p.id) ?? []
	}));
}

/** Editable fields of a phase (id fixed; raids/percent are computed elsewhere). */
export type PhaseInput = {
	name: string;
	label: string;
	status: Phase['status'];
	statusLabel: string;
	sort: number;
};

/** Update an existing phase by id. */
export async function updatePhase(db: Db, id: string, p: PhaseInput): Promise<void> {
	await db.update(phases).set(p).where(eq(phases.id, id));
}

/** Editable fields of a raid (id fixed; bosses/progress are computed elsewhere). */
export type RaidInput = { name: string; abbr: string | null; sort: number };

/** Update an existing raid by id. */
export async function updateRaid(db: Db, id: string, r: RaidInput): Promise<void> {
	await db.update(raids).set(r).where(eq(raids.id, id));
}

/** Editable fields of a boss (no id — the whole raid's list is replaced at once). */
export type BossListInput = { name: string; defeated: boolean };

/**
 * Replace every boss for a raid, preserving order via `sort`. Mirrors
 * `setRaidNights`'s delete-all-then-reinsert pattern — safe here too since
 * nothing else references a boss row by id (feats store the boss NAME as free
 * text, not a foreign key). Blank names are dropped.
 */
export async function setBossesForRaid(
	db: Db,
	raidId: string,
	list: BossListInput[]
): Promise<void> {
	await db.delete(bosses).where(eq(bosses.raidId, raidId));
	const rows = list
		.filter((b) => b.name.trim().length > 0)
		.map((b, i) => ({ raidId, name: b.name.trim(), defeated: b.defeated ? 1 : 0, sort: i }));
	if (rows.length > 0) await db.insert(bosses).values(rows);
}
