/**
 * Raid teams (Cores) repository.
 */

import { asc, eq } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { teams } from '$lib/server/db/schema';
import type { Team } from '$lib/data/teams';

/** Editable fields of a raid team (the `id` is its primary key string). */
export type TeamInput = {
	id: string;
	name: string;
	scheduleDays: string;
	scheduleTime: string;
	scheduleTimezone: string;
	sscKills: number;
	sscTotal: number;
	tkKills: number;
	tkTotal: number;
	recruiting: boolean;
	note: string | null;
	wclGuildId: number | null;
	sort: number;
};

/** Load every raid team in display order, mapped to the `Team` domain model. */
export async function getTeams(db: Db): Promise<Team[]> {
	const rows = await db.select().from(teams).orderBy(asc(teams.sort)).all();
	return rows.map((t) => ({
		id: t.id,
		name: t.name,
		schedule: {
			days: t.scheduleDays,
			time: t.scheduleTime,
			timezone: t.scheduleTimezone
		},
		ssc: { kills: t.sscKills, total: t.sscTotal },
		tk: { kills: t.tkKills, total: t.tkTotal },
		recruiting: t.recruiting === 1,
		note: t.note ?? undefined,
		wclGuildId: t.wclGuildId ?? undefined
	}));
}

/** Map a TeamInput to the snake_case column shape (recruiting → 0/1). */
function toRow(t: TeamInput) {
	return {
		name: t.name,
		scheduleDays: t.scheduleDays,
		scheduleTime: t.scheduleTime,
		scheduleTimezone: t.scheduleTimezone,
		sscKills: t.sscKills,
		sscTotal: t.sscTotal,
		tkKills: t.tkKills,
		tkTotal: t.tkTotal,
		recruiting: t.recruiting ? 1 : 0,
		note: t.note,
		wclGuildId: t.wclGuildId,
		sort: t.sort
	};
}

/** Insert a new raid team. The caller supplies a unique `id` (e.g. "core-8"). */
export async function createTeam(db: Db, t: TeamInput): Promise<void> {
	await db.insert(teams).values({ id: t.id, ...toRow(t) });
}

/** Update an existing raid team by id (id itself is not changed). */
export async function updateTeam(
	db: Db,
	id: string,
	fields: Omit<TeamInput, 'id'>
): Promise<void> {
	await db.update(teams).set(toRow({ id, ...fields })).where(eq(teams.id, id));
}

/** Delete a raid team by id. */
export async function deleteTeam(db: Db, id: string): Promise<void> {
	await db.delete(teams).where(eq(teams.id, id));
}
