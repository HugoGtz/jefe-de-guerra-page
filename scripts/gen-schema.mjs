#!/usr/bin/env node
/**
 * Generate `db/schema.sql` from the Drizzle schema (the single source of truth
 * in `src/lib/server/db/schema.ts`).
 *
 * Runs `drizzle-kit export` (prints SQL DDL to stdout) and post-processes it so
 * the result preserves the project's idempotent "recreate" workflow:
 *   - a leading `PRAGMA foreign_keys = ON;` (D1 honours FKs/cascades),
 *   - `CREATE TABLE IF NOT EXISTS` instead of bare `CREATE TABLE`, so applying
 *     the file to an already-populated D1 is a no-op rather than an error.
 *
 * Output applies cleanly to a FRESH D1 and is structurally equivalent to the
 * previous hand-written schema, so `db/seed.sql` still loads unchanged.
 *
 * Usage: node scripts/gen-schema.mjs   (wired as `npm run db:schema`)
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const SCHEMA = './src/lib/server/db/schema.ts';
const OUT = './db/schema.sql';

const ddl = execFileSync(
	'npx',
	['drizzle-kit', 'export', '--dialect=sqlite', `--schema=${SCHEMA}`],
	{ encoding: 'utf8' }
);

const header = `-- Jefe de Guerra — D1 schema (guild dynamic content).
-- GENERATED FILE — do not edit by hand.
-- Source of truth: src/lib/server/db/schema.ts  (regenerate: npm run db:schema)
-- Apply: wrangler d1 execute jefe-de-guerra --file=db/schema.sql [--local|--remote]

PRAGMA foreign_keys = ON;

`;

// Make every CREATE TABLE idempotent (recreate flow re-applies safely).
const body = ddl.replace(/CREATE TABLE /g, 'CREATE TABLE IF NOT EXISTS ');

writeFileSync(OUT, header + body.trimStart().replace(/\s*$/, '\n'), 'utf8');
console.log(`Wrote ${OUT}`);
