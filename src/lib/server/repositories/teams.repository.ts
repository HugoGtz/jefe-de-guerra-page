/**
 * Raid teams (Cores) repository.
 */

import { asc } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { teams } from '$lib/server/db/schema';
import type { Team } from '$lib/data/teams';

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
