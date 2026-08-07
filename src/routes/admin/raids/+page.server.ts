import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	listPhasesAdmin,
	updatePhase,
	updateRaid,
	setBossesForRaid,
	type PhaseInput,
	type RaidInput,
	type BossListInput
} from '$lib/server/repositories';
import { DB_ERROR, requireDb } from '$lib/server/admin';

const STATUSES = ['completed', 'in-progress', 'upcoming'] as const;

export const load: PageServerLoad = async ({ platform }) => {
	const db = requireDb(platform);
	const phases = await listPhasesAdmin(db);
	return { phases };
};

function int(raw: FormDataEntryValue | null, fallback = 0): number {
	const n = Number.parseInt(String(raw ?? ''), 10);
	return Number.isFinite(n) ? n : fallback;
}

export const actions: Actions = {
	/** Save one phase's own fields (name/label/status/sort) — its raids are untouched. */
	updatePhase: async ({ request, platform }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const statusRaw = String(form.get('status') ?? '');
		const status = (STATUSES as readonly string[]).includes(statusRaw)
			? (statusRaw as PhaseInput['status'])
			: 'upcoming';
		const fields: PhaseInput = {
			name: String(form.get('name') ?? '').trim(),
			label: String(form.get('label') ?? '').trim(),
			status,
			statusLabel: String(form.get('statusLabel') ?? '').trim(),
			sort: int(form.get('sort'))
		};
		if (!id || fields.name.length === 0) {
			return fail(400, { error: 'Falta el nombre de la fase.', scope: 'phase', id });
		}
		try {
			await updatePhase(requireDb(platform), id, fields);
		} catch {
			return fail(503, { error: DB_ERROR, scope: 'phase', id });
		}
		return { success: 'Fase actualizada.', scope: 'phase', id };
	},

	/**
	 * Save one raid: its own fields (name/abbr/sort) AND its full boss list in one
	 * submit — the boss list arrives as parallel arrays (bossName[]/bossDefeated[])
	 * and REPLACES the raid's existing bosses (see `setBossesForRaid`).
	 */
	updateRaid: async ({ request, platform }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const abbr = String(form.get('abbr') ?? '').trim();
		const fields: RaidInput = {
			name: String(form.get('name') ?? '').trim(),
			abbr: abbr.length > 0 ? abbr : null,
			sort: int(form.get('sort'))
		};
		if (!id || fields.name.length === 0) {
			return fail(400, { error: 'Falta el nombre del raid.', scope: 'raid', id });
		}

		const namesArr = form.getAll('bossName').map((v) => String(v));
		const defeatedArr = form.getAll('bossDefeated').map((v) => v === 'true');
		const bossList: BossListInput[] = namesArr.map((name, i) => ({
			name,
			defeated: defeatedArr[i] ?? false
		}));

		try {
			const db = requireDb(platform);
			await updateRaid(db, id, fields);
			await setBossesForRaid(db, id, bossList);
		} catch {
			return fail(503, { error: DB_ERROR, scope: 'raid', id });
		}
		return { success: 'Raid actualizado.', scope: 'raid', id };
	}
};
