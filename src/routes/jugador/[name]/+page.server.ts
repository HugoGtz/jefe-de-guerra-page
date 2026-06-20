import type { PageServerLoad } from './$types';
import { loadWclCharacterCached, loadPlayerRecentKills } from '$lib/server/data';

/**
 * Internal player-detail page ("our own parser UI"). Loads the character's
 * SSC/TK detail from the per-name 6h cache, plus the recent-kills histórico from
 * the shared rankings cache (no extra fetch). A null detail does NOT 404 — the
 * page renders a friendly empty state with the name + a "Ver en WarcraftLogs"
 * link, so an unknown/typo name never crashes. The route param is URL-decoded.
 */
export const load: PageServerLoad = async ({ params, platform }) => {
	const name = decodeURIComponent(params.name);

	const [detail, recent] = await Promise.all([
		loadWclCharacterCached(platform, name),
		loadPlayerRecentKills(platform, name)
	]);

	return { name, detail, recent };
};
