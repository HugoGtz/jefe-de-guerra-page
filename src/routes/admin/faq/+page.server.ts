import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listFaqAdmin, createFaq, updateFaq, deleteFaq, type FaqInput } from '$lib/server/repositories';
import { DB_ERROR, requireDb } from '$lib/server/admin';

export const load: PageServerLoad = async ({ platform }) => {
	const db = requireDb(platform);
	const faq = await listFaqAdmin(db);
	return { faq };
};

function int(raw: FormDataEntryValue | null, fallback = 0): number {
	const n = Number.parseInt(String(raw ?? ''), 10);
	return Number.isFinite(n) ? n : fallback;
}

function parseFields(form: FormData): FaqInput {
	return {
		q: String(form.get('q') ?? '').trim(),
		a: String(form.get('a') ?? '').trim(),
		sort: int(form.get('sort'))
	};
}

export const actions: Actions = {
	create: async ({ request, platform }) => {
		const form = await request.formData();
		const fields = parseFields(form);
		if (fields.q.length === 0 || fields.a.length === 0) {
			return fail(400, { error: 'La pregunta y la respuesta son obligatorias.' });
		}
		try {
			await createFaq(requireDb(platform), fields);
		} catch {
			return fail(503, { error: DB_ERROR });
		}
		return { success: 'Pregunta añadida.' };
	},

	update: async ({ request, platform }) => {
		const form = await request.formData();
		const id = int(form.get('id'), -1);
		const fields = parseFields(form);
		if (id < 0) return fail(400, { error: 'Falta el identificador de la pregunta.' });
		if (fields.q.length === 0 || fields.a.length === 0) {
			return fail(400, { error: 'La pregunta y la respuesta son obligatorias.' });
		}
		try {
			await updateFaq(requireDb(platform), id, fields);
		} catch {
			return fail(503, { error: DB_ERROR });
		}
		return { success: 'Pregunta actualizada.' };
	},

	delete: async ({ request, platform }) => {
		const form = await request.formData();
		const id = int(form.get('id'), -1);
		if (id < 0) return fail(400, { error: 'Falta el identificador de la pregunta.' });
		try {
			await deleteFaq(requireDb(platform), id);
		} catch {
			return fail(503, { error: DB_ERROR });
		}
		return { success: 'Pregunta eliminada.' };
	}
};
