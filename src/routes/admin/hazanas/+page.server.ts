import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	listFeatsAdmin,
	createFeat,
	updateFeat,
	deleteFeat,
	type FeatInput
} from '$lib/server/repositories';
import { DB_ERROR, requireDb } from '$lib/server/admin';

const RAIDS = ['SSC', 'TK', 'Karazhan', 'Gruul', 'Magtheridon'] as const;

export const load: PageServerLoad = async ({ platform }) => {
	const db = requireDb(platform);
	const feats = await listFeatsAdmin(db);
	return { feats, raids: RAIDS };
};

function int(raw: FormDataEntryValue | null, fallback = 0): number {
	const n = Number.parseInt(String(raw ?? ''), 10);
	return Number.isFinite(n) ? n : fallback;
}

function parseFields(form: FormData): FeatInput {
	const raidRaw = String(form.get('raid') ?? '');
	const raid = (RAIDS as readonly string[]).includes(raidRaw)
		? (raidRaw as FeatInput['raid'])
		: 'SSC';
	const team = String(form.get('team') ?? '').trim();
	return {
		boss: String(form.get('boss') ?? '').trim(),
		raid,
		date: String(form.get('date') ?? '').trim(),
		team: team.length > 0 ? team : null,
		firstKill: form.get('firstKill') != null,
		sort: int(form.get('sort'))
	};
}

export const actions: Actions = {
	create: async ({ request, platform }) => {
		const form = await request.formData();
		const fields = parseFields(form);
		if (fields.boss.length === 0 || fields.date.length === 0) {
			return fail(400, { error: 'El jefe y la fecha son obligatorios.' });
		}
		try {
			await createFeat(requireDb(platform), fields);
		} catch {
			return fail(503, { error: DB_ERROR });
		}
		return { success: 'Hazaña añadida.' };
	},

	update: async ({ request, platform }) => {
		const form = await request.formData();
		const id = int(form.get('id'), -1);
		const fields = parseFields(form);
		if (id < 0) return fail(400, { error: 'Falta el identificador de la hazaña.' });
		if (fields.boss.length === 0 || fields.date.length === 0) {
			return fail(400, { error: 'El jefe y la fecha son obligatorios.', id });
		}
		try {
			await updateFeat(requireDb(platform), id, fields);
		} catch {
			return fail(503, { error: DB_ERROR, id });
		}
		return { success: 'Hazaña actualizada.', id };
	},

	delete: async ({ request, platform }) => {
		const form = await request.formData();
		const id = int(form.get('id'), -1);
		if (id < 0) return fail(400, { error: 'Falta el identificador de la hazaña.' });
		try {
			await deleteFeat(requireDb(platform), id);
		} catch {
			return fail(503, { error: DB_ERROR });
		}
		return { success: 'Hazaña eliminada.' };
	}
};
