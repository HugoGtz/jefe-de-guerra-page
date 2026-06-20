import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	listOfficersAdmin,
	createOfficer,
	updateOfficer,
	deleteOfficer,
	type OfficerInput
} from '$lib/server/repositories';
import { DB_ERROR, requireDb } from '$lib/server/admin';

export const load: PageServerLoad = async ({ platform }) => {
	const db = requireDb(platform);
	const officers = await listOfficersAdmin(db);
	return { officers };
};

function int(raw: FormDataEntryValue | null, fallback = 0): number {
	const n = Number.parseInt(String(raw ?? ''), 10);
	return Number.isFinite(n) ? n : fallback;
}

/** Build the editable officer fields from a form (class/line are optional). */
function parseFields(form: FormData): OfficerInput {
	return {
		name: String(form.get('name') ?? '').trim(),
		role: String(form.get('role') ?? '').trim(),
		wowClass: String(form.get('wowClass') ?? '').trim(),
		classLabel: String(form.get('classLabel') ?? '').trim(),
		line: String(form.get('line') ?? '').trim(),
		sort: int(form.get('sort'))
	};
}

export const actions: Actions = {
	create: async ({ request, platform }) => {
		const form = await request.formData();
		const fields = parseFields(form);
		if (fields.name.length === 0 || fields.role.length === 0) {
			return fail(400, { error: 'El nombre y el rol del oficial son obligatorios.' });
		}
		try {
			await createOfficer(requireDb(platform), fields);
		} catch {
			return fail(503, { error: DB_ERROR });
		}
		return { success: 'Oficial añadido.' };
	},

	update: async ({ request, platform }) => {
		const form = await request.formData();
		const id = int(form.get('id'), -1);
		const fields = parseFields(form);
		if (id < 0) return fail(400, { error: 'Falta el identificador del oficial.' });
		if (fields.name.length === 0 || fields.role.length === 0) {
			return fail(400, { error: 'El nombre y el rol del oficial son obligatorios.' });
		}
		try {
			await updateOfficer(requireDb(platform), id, fields);
		} catch {
			return fail(503, { error: DB_ERROR });
		}
		return { success: 'Oficial actualizado.' };
	},

	delete: async ({ request, platform }) => {
		const form = await request.formData();
		const id = int(form.get('id'), -1);
		if (id < 0) return fail(400, { error: 'Falta el identificador del oficial.' });
		try {
			await deleteOfficer(requireDb(platform), id);
		} catch {
			return fail(503, { error: DB_ERROR });
		}
		return { success: 'Oficial eliminado.' };
	}
};
