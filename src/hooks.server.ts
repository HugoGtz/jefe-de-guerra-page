/**
 * Server hook: the gate in front of the /admin panel.
 *
 * For any /admin path it verifies the signed session cookie, resolves the `uid`
 * back to a real user row, and exposes `event.locals.user` (and the legacy
 * `event.locals.admin = !!user`) on EVERY request so layouts/pages can read it.
 *
 * Two redirects guard the panel (login excepted):
 *   - not authenticated            → /admin/login
 *   - authed but must change pw     → /admin/cambiar-password (trapped there
 *     until done; /admin/logout is still reachable so they can bail out).
 *
 * FAILS CLOSED: if `event.platform`/`env`/`DB` is missing (SSR/build) or
 * `ADMIN_PASSWORD` is unset, the session can't verify and /admin is
 * inaccessible. Non-/admin routes are never affected.
 */

import { redirect, type Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, verifySession } from '$lib/server/auth';
import { getDb } from '$lib/server/db/client';
import { getById } from '$lib/server/repositories';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
	const isLogin = pathname === '/admin/login';
	const isChangePw = pathname === '/admin/cambiar-password';
	const isLogout = pathname === '/admin/logout';

	// Resolve the session → user. No platform/env/DB ⇒ not authed (fail closed).
	let user: App.Locals['user'] = null;
	const env = event.platform?.env;
	if (env?.DB) {
		const token = event.cookies.get(SESSION_COOKIE);
		const session = await verifySession(token, env);
		if (session) {
			try {
				const row = await getById(getDb(env.DB), session.uid);
				if (row) {
					user = {
						id: row.id,
						username: row.username,
						mustChange: row.mustChangePassword === 1
					};
				}
			} catch {
				user = null;
			}
		}
	}

	event.locals.user = user;
	event.locals.admin = !!user;

	if (isAdmin && !isLogin) {
		if (!user) {
			throw redirect(303, '/admin/login');
		}
		// Trap must-change users on the change-password page until they're done.
		if (user.mustChange && !isChangePw && !isLogout) {
			throw redirect(303, '/admin/cambiar-password');
		}
	}

	return resolve(event);
};
