/**
 * Small shared helpers for the /admin editor server modules.
 *
 * `requireDb` resolves the Drizzle client from the platform binding and throws a
 * SvelteKit `error(503, …)` with a Spanish message when D1 is unavailable, so
 * loads degrade to a friendly page instead of a crash. `DB_ERROR` is the
 * standard Spanish message returned by actions when a write throws.
 */

import { error } from '@sveltejs/kit';
import { getDb, type Db } from '$lib/server/db/client';

/** Friendly Spanish message shown when a save fails due to a DB error. */
export const DB_ERROR = 'No se pudo guardar. Inténtalo de nuevo en unos segundos.';

/** Friendly Spanish message shown when a load fails due to a DB error. */
export const DB_LOAD_ERROR = 'No se pudo conectar con la base de datos. Inténtalo más tarde.';

/**
 * Resolve the Drizzle `Db` from the SvelteKit platform, or throw a 503 with a
 * Spanish message. Use in load functions; actions should catch DB throws and
 * return `fail(503, { error: DB_ERROR })` instead.
 */
export function requireDb(platform: App.Platform | undefined): Db {
	const binding = platform?.env?.DB;
	if (!binding) throw error(503, DB_LOAD_ERROR);
	return getDb(binding);
}
