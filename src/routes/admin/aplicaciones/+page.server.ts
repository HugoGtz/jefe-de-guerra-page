import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listApplicationsAdmin, markApplicationReviewed } from '$lib/server/repositories';
import { DB_ERROR, requireDb } from '$lib/server/admin';
import { getWclCharacterRecentReports } from '$lib/server/wcl';

export const load: PageServerLoad = async ({ platform }) => {
	const db = requireDb(platform);
	// Pending-first so new applications don't get buried under older reviewed
	// ones as the history grows; newest-first within each group.
	const applications = (await listApplicationsAdmin(db)).sort(
		(a, b) => Number(a.reviewed) - Number(b.reviewed)
	);
	return { applications };
};

export const actions: Actions = {
	/** Flip an application's reviewed flag. `reviewed` carries the NEW value. */
	toggleReviewed: async ({ request, platform }) => {
		const form = await request.formData();
		const id = Number.parseInt(String(form.get('id') ?? ''), 10);
		const reviewed = String(form.get('reviewed') ?? '') === 'true';
		if (!Number.isFinite(id)) {
			return fail(400, { error: 'Falta el identificador.', scope: 'toggle' as const, id });
		}
		try {
			await markApplicationReviewed(requireDb(platform), id, reviewed);
		} catch {
			return fail(503, { error: DB_ERROR, scope: 'toggle' as const, id });
		}
		return {
			success: reviewed ? 'Marcada como revisada.' : 'Marcada como pendiente.',
			scope: 'toggle' as const,
			id
		};
	},

	/**
	 * Recruitment screening: pull an applicant's recent WCL reports (any guild,
	 * any zone) so officers can sanity-check they're actually raiding lately
	 * before inviting. On-demand only — no D1 caching, this is a one-off lookup.
	 */
	checkActivity: async ({ request, platform }) => {
		const form = await request.formData();
		const id = Number.parseInt(String(form.get('id') ?? ''), 10);
		const character = String(form.get('character') ?? '').trim();
		if (!Number.isFinite(id) || !character) {
			return fail(400, {
				error: 'Falta el nombre de personaje.',
				scope: 'activity' as const,
				id
			});
		}
		const reports = await getWclCharacterRecentReports(platform?.env ?? {}, character);
		return { success: undefined, scope: 'activity' as const, id, reports };
	}
};
