import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	getRecruitment,
	updateRecruitmentMeta,
	setNeeds,
	setRequirements
} from '$lib/server/repositories';
import type { RecruitNeed } from '$lib/data/recruitment';
import { DB_ERROR, requireDb } from '$lib/server/admin';

export const load: PageServerLoad = async ({ platform }) => {
	const db = requireDb(platform);
	const recruitment = await getRecruitment(db);
	return { recruitment };
};

const PRIORITIES: RecruitNeed['priority'][] = ['alta', 'media', 'baja'];

function lines(raw: FormDataEntryValue | null): string[] {
	return String(raw ?? '')
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
}

export const actions: Actions = {
	default: async ({ request, platform }) => {
		const form = await request.formData();
		const intro = String(form.get('intro') ?? '').trim();
		const discordUrl = String(form.get('discordUrl') ?? '').trim();
		const whatsappUrl = String(form.get('whatsappUrl') ?? '').trim();

		// Needs arrive as parallel arrays: needLabel[] + needPriority[].
		const labels = form.getAll('needLabel').map((v) => String(v).trim());
		const priorities = form.getAll('needPriority').map((v) => String(v));
		const needs: RecruitNeed[] = [];
		for (let i = 0; i < labels.length; i++) {
			if (labels[i].length === 0) continue;
			const p = PRIORITIES.includes(priorities[i] as RecruitNeed['priority'])
				? (priorities[i] as RecruitNeed['priority'])
				: 'media';
			needs.push({ label: labels[i], priority: p });
		}

		const requirements = lines(form.get('requirements'));

		const values = { intro, discordUrl, whatsappUrl, needs, requirements };

		if (intro.length === 0) {
			return fail(400, { error: 'El texto de introducción es obligatorio.', values });
		}

		try {
			const db = requireDb(platform);
			await updateRecruitmentMeta(db, { intro, discordUrl, whatsappUrl });
			await setNeeds(db, needs);
			await setRequirements(db, requirements);
		} catch {
			return fail(503, { error: DB_ERROR, values });
		}

		return { success: true };
	}
};
