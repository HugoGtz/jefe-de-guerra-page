import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getGuild, updateGuild, setAboutParagraphs } from '$lib/server/repositories';
import { DB_ERROR, requireDb } from '$lib/server/admin';

export const load: PageServerLoad = async ({ platform }) => {
	const db = requireDb(platform);
	const guild = await getGuild(db);
	return { guild };
};

/** Split a textarea into trimmed, non-empty lines. */
function lines(raw: FormDataEntryValue | null): string[] {
	return String(raw ?? '')
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
}

export const actions: Actions = {
	default: async ({ request, platform }) => {
		const form = await request.formData();
		const get = (k: string) => String(form.get(k) ?? '').trim();

		const values = {
			name: get('name'),
			motto: get('motto'),
			badge: get('badge'),
			faction: get('faction'),
			server: get('server'),
			game: get('game'),
			scheduleDays: get('scheduleDays'),
			scheduleTime: get('scheduleTime'),
			scheduleTimezone: get('scheduleTimezone'),
			scheduleNote: get('scheduleNote'),
			who: String(form.get('who') ?? ''),
			vibe: String(form.get('vibe') ?? '')
		};

		// Server-side validation: required identity + schedule fields.
		const required: Array<[string, string]> = [
			['name', values.name],
			['motto', values.motto],
			['badge', values.badge],
			['faction', values.faction],
			['server', values.server],
			['game', values.game],
			['scheduleDays', values.scheduleDays],
			['scheduleTime', values.scheduleTime],
			['scheduleTimezone', values.scheduleTimezone]
		];
		if (required.some(([, v]) => v.length === 0)) {
			return fail(400, { error: 'Todos los campos de identidad y horario son obligatorios.', values });
		}

		try {
			const db = requireDb(platform);
			await updateGuild(db, {
				name: values.name,
				motto: values.motto,
				badge: values.badge,
				faction: values.faction,
				server: values.server,
				game: values.game,
				scheduleDays: values.scheduleDays,
				scheduleTime: values.scheduleTime,
				scheduleTimezone: values.scheduleTimezone,
				scheduleNote: values.scheduleNote.length > 0 ? values.scheduleNote : null
			});
			await setAboutParagraphs(db, lines(form.get('who')), lines(form.get('vibe')));
		} catch {
			return fail(503, { error: DB_ERROR, values });
		}

		return { success: true };
	}
};
