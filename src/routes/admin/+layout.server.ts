import type { LayoutServerLoad } from './$types';

/** Expose the auth flag so the admin layout can show/hide the logout topbar. */
export const load: LayoutServerLoad = async ({ locals }) => {
	return { admin: locals.admin };
};
