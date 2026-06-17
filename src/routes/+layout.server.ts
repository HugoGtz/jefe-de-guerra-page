import type { LayoutServerLoad } from './$types';
import { loadGuildData } from '$lib/server/data';

export const load: LayoutServerLoad = async ({ platform }) => {
	return await loadGuildData(platform);
};
