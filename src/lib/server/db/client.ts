/**
 * Drizzle client factory for the Cloudflare D1 binding.
 *
 * `getDb(platform)` wraps the `DB` binding in a typed Drizzle instance bound to
 * the schema in `./schema`. Repositories receive this instance via dependency
 * injection (they never reach for `platform.env.DB` themselves), which keeps
 * them testable and decoupled from the SvelteKit platform object.
 */

import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import * as schema from './schema';

/** Typed Drizzle DB bound to the full guild schema. */
export type Db = DrizzleD1Database<typeof schema>;

/**
 * Build a typed Drizzle client from the Cloudflare D1 binding.
 * Caller must have already verified `platform.env.DB` exists.
 */
export function getDb(db: D1Database): Db {
	return drizzle(db, { schema });
}
