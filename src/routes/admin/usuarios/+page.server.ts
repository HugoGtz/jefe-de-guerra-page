import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireDb, DB_ERROR } from '$lib/server/admin';
import { hashPassword } from '$lib/server/password';
import {
	countUsers,
	createUser,
	deleteUser,
	getById,
	getByUsername,
	listUsers
} from '$lib/server/repositories';

/** Minimum length for a temporary password set when creating a user. */
const MIN_LENGTH = 8;
/** Allowed username shape: letters, digits, dot, dash, underscore. */
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;

export const load: PageServerLoad = async ({ platform }) => {
	const db = requireDb(platform);
	const users = await listUsers(db);
	return { users };
};

export const actions: Actions = {
	create: async ({ request, platform }) => {
		const db = requireDb(platform);

		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!username || !password) {
			return fail(400, { error: 'Introduce usuario y contraseña temporal.', scope: 'create' });
		}
		if (!USERNAME_RE.test(username)) {
			return fail(400, {
				error: 'El usuario debe tener 3-32 caracteres: letras, números, ., - o _.',
				scope: 'create'
			});
		}
		if (password.length < MIN_LENGTH) {
			return fail(400, {
				error: `La contraseña temporal debe tener al menos ${MIN_LENGTH} caracteres.`,
				scope: 'create'
			});
		}

		try {
			const existing = await getByUsername(db, username);
			if (existing) {
				return fail(409, { error: `El usuario «${username}» ya existe.`, scope: 'create' });
			}
			const passwordHash = await hashPassword(password);
			await createUser(db, { username, passwordHash, mustChange: true });
		} catch {
			return fail(503, { error: DB_ERROR, scope: 'create' });
		}

		return { created: true, scope: 'create' };
	},

	delete: async ({ request, platform, locals }) => {
		const db = requireDb(platform);

		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isInteger(id) || id <= 0) {
			return fail(400, { error: 'Usuario no válido.', scope: 'delete' });
		}

		try {
			// Guard: never delete the last remaining user (would lock everyone out).
			const total = await countUsers(db);
			if (total <= 1) {
				return fail(409, {
					error: 'No puedes eliminar al último usuario: la cuenta quedaría sin acceso.',
					scope: 'delete'
				});
			}
			const target = await getById(db, id);
			if (!target) {
				return fail(404, { error: 'El usuario ya no existe.', scope: 'delete' });
			}
			await deleteUser(db, id);
		} catch {
			return fail(503, { error: DB_ERROR, scope: 'delete' });
		}

		const self = locals.user?.id === id;
		return { deleted: true, self, scope: 'delete' };
	}
};
