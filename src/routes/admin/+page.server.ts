import type { PageServerLoad } from './$types';
import {
	getPhases,
	getFeats,
	getTeams,
	listApplicationsAdmin,
	getCache
} from '$lib/server/repositories';
import { computeStats } from '$lib/server/data';
import { requireDb } from '$lib/server/admin';

/** Same cache keys as `/admin/wcl` — kept as a small local copy rather than a
 *  shared import (5 short labels, not worth a cross-route module). */
const WCL_CACHE_KEYS = [
	{ key: 'guild', label: 'Progreso y hazañas en vivo' },
	{ key: 'hall_of_fame_v4', label: 'Hall of Fame / rosters' },
	{ key: 'progress', label: 'Rango de progreso' },
	{ key: 'attendance', label: 'Asistencia' },
	{ key: 'officers', label: 'Oficiales' }
] as const;

export const load: PageServerLoad = async ({ platform }) => {
	const db = requireDb(platform);
	const [phases, feats, teams, applications, cacheStatus] = await Promise.all([
		getPhases(db),
		getFeats(db),
		getTeams(db),
		listApplicationsAdmin(db),
		Promise.all(
			WCL_CACHE_KEYS.map(async (ck) => ({
				...ck,
				fetchedAt: (await getCache(db, ck.key))?.fetchedAt ?? null
			}))
		)
	]);

	const stats = computeStats(phases, feats, teams, Date.now());
	const pendingApplications = applications.filter((a) => !a.reviewed).length;

	return { stats, pendingApplications, cacheStatus, now: Date.now() };
};
