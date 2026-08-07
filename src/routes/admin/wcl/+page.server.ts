import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getBossKills, deleteCache, deleteBossKill } from '$lib/server/repositories';
import { teams as staticTeams } from '$lib/data/teams';
import { DB_ERROR, requireDb } from '$lib/server/admin';
import { CURRENT_TIER } from '$lib/server/wcl-boss-ledger';
import { getWclRateLimit } from '$lib/server/wcl';

/** Every D1-cached WCL key the site refetches on a TTL — see `data.ts`. */
const CACHE_KEYS = [
	{ key: 'guild', label: 'Progreso y hazañas en vivo (~10 min)' },
	{ key: 'hall_of_fame_v4', label: 'Hall of Fame / rosters / rankings (~12 h)' },
	{ key: 'progress', label: 'Rango de progreso mundial/regional/servidor (~6 h)' },
	{ key: 'attendance', label: 'Asistencia por core (~6 h)' },
	{ key: 'officers', label: 'Enriquecimiento de oficiales (~1 h)' }
] as const;

export const load: PageServerLoad = async ({ platform }) => {
	const db = requireDb(platform);
	const rows = await getBossKills(db, CURRENT_TIER);
	const nameByGuildId = new Map<number, string>(
		staticTeams
			.filter((t): t is typeof t & { wclGuildId: number } => t.wclGuildId != null)
			.map((t) => [t.wclGuildId, t.name])
	);
	const ledger = rows
		.map((r) => ({
			...r,
			coreName: nameByGuildId.get(r.coreWclGuildId) ?? `Guild ${r.coreWclGuildId}`
		}))
		.sort((a, b) => a.coreName.localeCompare(b.coreName) || a.boss.localeCompare(b.boss));

	// Live quota check — deliberately not D1-cached (see rateLimit.ts). Never
	// throws, so a WCL outage here can't take down the rest of this page.
	const rateLimit = await getWclRateLimit(platform?.env ?? {});

	return { cacheKeys: CACHE_KEYS, ledger, tier: CURRENT_TIER, rateLimit };
};

export const actions: Actions = {
	/** Delete a cache row so the next page load treats it as a miss and refetches live. */
	refresh: async ({ request, platform }) => {
		const form = await request.formData();
		const key = String(form.get('key') ?? '');
		if (!CACHE_KEYS.some((c) => c.key === key)) {
			return fail(400, { error: 'Llave de caché desconocida.', scope: 'refresh' as const, key });
		}
		try {
			await deleteCache(requireDb(platform), key);
		} catch {
			return fail(503, { error: DB_ERROR, scope: 'refresh' as const, key });
		}
		return {
			success: 'Listo — se refrescará en la próxima carga del sitio.',
			scope: 'refresh' as const,
			key
		};
	},

	/** Correct a bad ledger entry without raw SQL. */
	deleteLedgerRow: async ({ request, platform }) => {
		const form = await request.formData();
		const coreWclGuildId = Number.parseInt(String(form.get('coreWclGuildId') ?? ''), 10);
		const boss = String(form.get('boss') ?? '');
		const tier = String(form.get('tier') ?? '');
		if (!Number.isFinite(coreWclGuildId) || !boss || !tier) {
			return fail(400, {
				error: 'Faltan datos para eliminar el registro.',
				scope: 'ledger' as const,
				coreWclGuildId,
				boss
			});
		}
		try {
			await deleteBossKill(requireDb(platform), coreWclGuildId, boss, tier);
		} catch {
			return fail(503, { error: DB_ERROR, scope: 'ledger' as const, coreWclGuildId, boss });
		}
		return {
			success: 'Registro eliminado del histórico.',
			scope: 'ledger' as const,
			coreWclGuildId,
			boss
		};
	}
};
