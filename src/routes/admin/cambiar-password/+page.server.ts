import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SESSION_COOKIE } from '$lib/server/auth';
import { hashPassword, verifyPassword } from '$lib/server/password';
import { getDb } from '$lib/server/db/client';
import { getById, updatePassword } from '$lib/server/repositories';

/** Minimum length for a new password. */
const MIN_LENGTH = 8;

export const load: PageServerLoad = async ({ locals }) => {
	// The hook guarantees an authed user reaches /admin/*; satisfy the type and
	// fail closed if somehow absent.
	if (!locals.user) throw redirect(303, '/admin/login');
	return { mustChange: locals.user.mustChange };
};

export const actions: Actions = {
	default: async ({ request, cookies, platform, locals, url }) => {
		const env = platform?.env;
		if (!env?.DB) {
			return fail(500, { error: 'Configuración del servidor no disponible.' });
		}
		if (!locals.user) {
			throw redirect(303, '/admin/login');
		}
		const db = getDb(env.DB);

		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		const confirm = String(form.get('confirm') ?? '');

		if (!current || !next || !confirm) {
			return fail(400, { error: 'Completa todos los campos.' });
		}
		if (next.length < MIN_LENGTH) {
			return fail(400, { error: `La nueva contraseña debe tener al menos ${MIN_LENGTH} caracteres.` });
		}
		if (next !== confirm) {
			return fail(400, { error: 'La nueva contraseña y su confirmación no coinciden.' });
		}
		if (next === current) {
			return fail(400, { error: 'La nueva contraseña debe ser distinta de la actual.' });
		}

		try {
			const user = await getById(db, locals.user.id);
			if (!user) {
				// Session points at a deleted user: clear cookie and bounce to login.
				cookies.delete(SESSION_COOKIE, { path: '/' });
				return fail(401, { error: 'Tu sesión ya no es válida. Inicia sesión de nuevo.' });
			}
			const ok = await verifyPassword(current, user.passwordHash);
			if (!ok) {
				return fail(401, { error: 'La contraseña actual es incorrecta.' });
			}
			const passwordHash = await hashPassword(next);
			await updatePassword(db, user.id, passwordHash, false);
		} catch {
			return fail(500, { error: 'No se pudo actualizar la contraseña. Inténtalo de nuevo.' });
		}

		// Force a fresh login with the new credentials.
		cookies.delete(SESSION_COOKIE, { path: '/' });
		throw redirect(303, '/admin/login?cambiada=1');
	}
};
