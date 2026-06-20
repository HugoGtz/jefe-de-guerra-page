import { redirect, type RequestHandler } from '@sveltejs/kit';
import { SESSION_COOKIE } from '$lib/server/auth';

/** Clear the session cookie and return to the login page. */
export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete(SESSION_COOKIE, { path: '/' });
	throw redirect(303, '/admin/login');
};
