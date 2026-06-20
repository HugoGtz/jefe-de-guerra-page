import type { LayoutServerLoad } from './$types';

/**
 * Expose the auth flag + the current user so the admin layout can show/hide the
 * chrome and pages can identify "yourself". Never includes the password hash.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	return { admin: locals.admin, user: locals.user };
};
