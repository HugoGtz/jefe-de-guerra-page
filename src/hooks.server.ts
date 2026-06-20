/**
 * Server hook: the gate in front of the /admin panel.
 *
 * For any /admin path (except /admin/login) it verifies the signed session
 * cookie and redirects unauthenticated requests to the login page. It sets
 * `event.locals.admin` on EVERY request so layouts/pages can read it.
 *
 * FAILS CLOSED: if `event.platform` is missing (SSR/build) or `ADMIN_PASSWORD`
 * is unset, `verifySession` returns false and /admin is inaccessible. Non-/admin
 * routes are never affected.
 */

import { redirect, type Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, verifySession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
	const isLogin = pathname === '/admin/login';

	// Verify the session for admin requests. No platform/env ⇒ not authed.
	let authed = false;
	const env = event.platform?.env;
	if (env) {
		const token = event.cookies.get(SESSION_COOKIE);
		authed = await verifySession(token, env);
	}
	event.locals.admin = authed;

	if (isAdmin && !isLogin && !authed) {
		throw redirect(303, '/admin/login');
	}

	return resolve(event);
};
