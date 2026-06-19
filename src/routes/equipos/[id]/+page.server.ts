import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadCoreRoster } from '$lib/server/data';

/**
 * Core detail page. Reuses the layout's already-loaded (WCL-overridden) teams via
 * `parent()` so the team's SSC/TK progress stays consistent and DRY; only the
 * per-core roster is fetched here, straight from the shared 12h rankings cache
 * (no extra network beyond what the layout already warms). A roster of null/empty
 * renders a tasteful empty state — the page never crashes on missing WCL data.
 */
export const load: PageServerLoad = async ({ params, parent, platform }) => {
	const { teams } = await parent();
	const team = teams.find((t) => t.id === params.id);
	if (!team) throw error(404, 'Core no encontrado');

	const roster = await loadCoreRoster(platform, team.wclGuildId);

	return { team, roster };
};
