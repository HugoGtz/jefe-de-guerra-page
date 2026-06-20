import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getTeams, createTeam, updateTeam, deleteTeam, type TeamInput } from '$lib/server/repositories';
import { DB_ERROR, requireDb } from '$lib/server/admin';

export const load: PageServerLoad = async ({ platform }) => {
	const db = requireDb(platform);
	const teams = await getTeams(db);
	return { teams };
};

/** Parse a non-negative integer from a form value, defaulting to 0. */
function int(raw: FormDataEntryValue | null, fallback = 0): number {
	const n = Number.parseInt(String(raw ?? ''), 10);
	return Number.isFinite(n) ? n : fallback;
}

/** Build the editable fields (everything but id) from a form. */
function parseFields(form: FormData): Omit<TeamInput, 'id'> {
	const wclRaw = String(form.get('wclGuildId') ?? '').trim();
	const wclNum = Number.parseInt(wclRaw, 10);
	return {
		name: String(form.get('name') ?? '').trim(),
		scheduleDays: String(form.get('scheduleDays') ?? '').trim(),
		scheduleTime: String(form.get('scheduleTime') ?? '').trim(),
		scheduleTimezone: String(form.get('scheduleTimezone') ?? '').trim(),
		sscKills: int(form.get('sscKills')),
		sscTotal: int(form.get('sscTotal'), 6),
		tkKills: int(form.get('tkKills')),
		tkTotal: int(form.get('tkTotal'), 4),
		recruiting: form.get('recruiting') != null,
		note: (() => {
			const n = String(form.get('note') ?? '').trim();
			return n.length > 0 ? n : null;
		})(),
		wclGuildId: wclRaw.length > 0 && Number.isFinite(wclNum) ? wclNum : null,
		sort: int(form.get('sort'))
	};
}

export const actions: Actions = {
	create: async ({ request, platform }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const fields = parseFields(form);
		if (id.length === 0 || fields.name.length === 0) {
			return fail(400, { error: 'El identificador y el nombre del equipo son obligatorios.' });
		}
		if (!/^[a-z0-9-]+$/.test(id)) {
			return fail(400, { error: 'El identificador solo puede tener minúsculas, números y guiones (p. ej. core-8).' });
		}
		try {
			const db = requireDb(platform);
			await createTeam(db, { id, ...fields });
		} catch {
			return fail(503, { error: 'No se pudo crear el equipo. ¿El identificador ya existe?' });
		}
		return { success: 'Equipo creado.' };
	},

	update: async ({ request, platform }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const fields = parseFields(form);
		if (id.length === 0 || fields.name.length === 0) {
			return fail(400, { error: 'El nombre del equipo es obligatorio.' });
		}
		try {
			const db = requireDb(platform);
			await updateTeam(db, id, fields);
		} catch {
			return fail(503, { error: DB_ERROR });
		}
		return { success: 'Equipo actualizado.' };
	},

	delete: async ({ request, platform }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (id.length === 0) return fail(400, { error: 'Falta el identificador del equipo.' });
		try {
			const db = requireDb(platform);
			await deleteTeam(db, id);
		} catch {
			return fail(503, { error: DB_ERROR });
		}
		return { success: 'Equipo eliminado.' };
	}
};
