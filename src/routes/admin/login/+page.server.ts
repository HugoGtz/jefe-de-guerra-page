import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SESSION_COOKIE, SESSION_MAX_AGE_S, checkPassword, createSession } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	// Already authenticated → straight to the dashboard.
	if (locals.admin) throw redirect(303, '/admin');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, platform, url }) => {
		const env = platform?.env;
		if (!env) {
			return fail(500, { error: 'Configuración del servidor no disponible.' });
		}

		const form = await request.formData();
		const password = String(form.get('password') ?? '');

		if (!checkPassword(password, env)) {
			return fail(401, { error: 'Contraseña incorrecta.' });
		}

		const token = await createSession(env);
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

		throw redirect(303, '/admin');
	}
};
