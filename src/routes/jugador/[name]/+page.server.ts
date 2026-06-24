import type { PageServerLoad } from './$types';
import {
	loadWclCharacterCached,
	loadPlayerRecentKills,
	loadPlayerStanding
} from '$lib/server/data';
import { parseTier } from '$lib/parse';

/**
 * Internal player-detail page ("our own parser UI"). Everything the page needs
 * is computed/shaped HERE on the server: the SSC/TK detail (per-name 6h cache),
 * the recent-kills histórico + the player's guild standing (both off the shared
 * rankings cache, no extra fetch), and the parse `tier` band — so the client only
 * formats, it doesn't derive. A null detail does NOT 404; the page renders a
 * friendly empty state. The route param is URL-decoded.
 */
export const load: PageServerLoad = async ({ params, platform }) => {
	const name = decodeURIComponent(params.name);

	const [detail, recent, standing] = await Promise.all([
		loadWclCharacterCached(platform, name),
		loadPlayerRecentKills(platform, name),
		loadPlayerStanding(platform, name)
	]);

	// Derive the parse tier server-side (client just renders the band).
	const tier = detail ? parseTier(detail.bestAvg) : null;

	return { name, detail, recent, standing, tier };
};
