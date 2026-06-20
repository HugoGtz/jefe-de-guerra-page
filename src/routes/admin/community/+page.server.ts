import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	getCommunityMeta,
	getRaidNights,
	updateCommunityMeta,
	setRaidNights
} from '$lib/server/repositories';
import type { RaidNight } from '$lib/data/community';
import { DB_ERROR, requireDb } from '$lib/server/admin';

export const load: PageServerLoad = async ({ platform }) => {
	const db = requireDb(platform);
	const [meta, raidNights] = await Promise.all([getCommunityMeta(db), getRaidNights(db)]);
	return { meta, raidNights };
};

/** Accept HH:MM (24h). */
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

export const actions: Actions = {
	default: async ({ request, platform }) => {
		const form = await request.formData();
		const discordServerId = String(form.get('discordServerId') ?? '').trim();
		const raidTimezone = String(form.get('raidTimezone') ?? '').trim() || 'ST';

		// Raid nights arrive as parallel arrays: nightTeam[] + nightWeekday[] + nightTime[].
		const teamsArr = form.getAll('nightTeam').map((v) => String(v).trim());
		const weekdaysArr = form.getAll('nightWeekday').map((v) => Number.parseInt(String(v), 10));
		const timesArr = form.getAll('nightTime').map((v) => String(v).trim());

		const nights: RaidNight[] = [];
		for (let i = 0; i < timesArr.length; i++) {
			const time = timesArr[i];
			if (time.length === 0) continue; // skip blank rows
			if (!TIME_RE.test(time)) {
				return fail(400, {
					error: `Hora inválida "${time}". Usa el formato HH:MM (24h).`,
					values: { discordServerId, raidTimezone }
				});
			}
			const weekday = weekdaysArr[i];
			if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
				return fail(400, {
					error: 'Día de la semana inválido (debe ser 0–6).',
					values: { discordServerId, raidTimezone }
				});
			}
			nights.push({
				team: teamsArr[i].length > 0 ? teamsArr[i] : undefined,
				weekday,
				time
			});
		}

		try {
			const db = requireDb(platform);
			await updateCommunityMeta(db, { discordServerId, raidTimezone });
			await setRaidNights(db, nights);
		} catch {
			return fail(503, { error: DB_ERROR, values: { discordServerId, raidTimezone } });
		}

		return { success: true };
	}
};
