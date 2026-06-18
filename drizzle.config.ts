/**
 * Drizzle Kit config. Used only for tooling (`npm run db:schema`, which runs
 * `drizzle-kit export` to print the SQL DDL from `src/lib/server/db/schema.ts`
 * into `db/schema.sql`). At runtime the app talks to D1 via the `DB` binding,
 * not through this config.
 *
 * Single source of truth = `schema.ts`. We deliberately do NOT use a `drizzle/`
 * migrations directory — the project keeps ONE generated schema file plus a
 * seed, applied to D1 with `wrangler d1 execute`.
 */

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	dialect: 'sqlite',
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle'
});
