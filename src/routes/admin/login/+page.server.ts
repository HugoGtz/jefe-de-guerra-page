import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SESSION_COOKIE, SESSION_MAX_AGE_S, checkPassword, createSession } from '$lib/server/auth';
import { hashPassword, verifyPassword } from '$lib/server/password';
import { getDb } from '$lib/server/db/client';
import { countUsers, createUser, getByUsername } from '$lib/server/repositories';

/** Username given to the bootstrap account created from the env default. */
const BOOTSTRAP_USERNAME = 'admin';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Already authenticated → straight to the dashboard.
	if (locals.user) throw redirect(303, '/admin');
	// Surface a one-time notice (e.g. after changing the password).
	return { notice: url.searchParams.get('cambiada') === '1' };
};

export const actions: Actions = {
	default: async ({ request, cookies, platform, url }) => {
		const env = platform?.env;
		if (!env?.DB) {
			return fail(500, { error: 'Configuración del servidor no disponible.' });
		}
		const db = getDb(env.DB);

		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!username || !password) {
			return fail(400, { error: 'Introduce usuario y contraseña.' });
		}

		let uid: number;

		try {
			const total = await countUsers(db);

			if (total === 0) {
				// ── Bootstrap window: only `admin` + the env default password ──
				if (username !== BOOTSTRAP_USERNAME || !checkPassword(password, env)) {
					return fail(401, { error: 'Usuario o contraseña incorrectos.' });
				}
				// Create the first user from the default password, forcing a change.
				const passwordHash = await hashPassword(password);
				uid = await createUser(db, {
					username: BOOTSTRAP_USERNAME,
					passwordHash,
					mustChange: true
				});
			} else {
				// ── Normal login: verify against the stored PBKDF2 hash ──
				const user = await getByUsername(db, username);
				// Always run a verify to keep timing similar whether or not the
				// user exists; the result is discarded when user is null.
				const stored =
					user?.passwordHash ?? 'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
				const ok = await verifyPassword(password, stored);
				if (!user || !ok) {
					return fail(401, { error: 'Usuario o contraseña incorrectos.' });
				}
				uid = user.id;
			}
		} catch {
			return fail(500, { error: 'No se pudo iniciar sesión. Inténtalo de nuevo.' });
		}

		const token = await createSession(uid, env);
		if (!token) {
			return fail(500, { error: 'No se pudo iniciar sesión. Contacta a un administrador.' });
		}

		cookies.set(SESSION_COOKIE, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: SESSION_MAX_AGE_S
		});

		// The hook bounces must-change users to /admin/cambiar-password.
		throw redirect(303, '/admin');
	}
};
