/**
 * Users repository — the admin accounts for the /admin panel.
 *
 * SECURITY: list helpers NEVER include `passwordHash`. Only the auth flow reads
 * the hash (via `getByUsername`/`getById`, which return the full row server-side)
 * and it must never be forwarded to the client. All reads are resilient: lookups
 * return `null` when absent rather than throwing.
 */

import { asc, eq, sql } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { users, type UserRow } from '$lib/server/db/schema';

/** A user row safe to surface to the admin UI (NEVER includes the hash). */
export type UserListItem = {
	id: number;
	username: string;
	mustChange: boolean;
	createdAt: number;
};

/** Input for creating a user. */
export type CreateUserInput = {
	username: string;
	passwordHash: string;
	mustChange: boolean;
};

/** Count all users. Used to detect the empty-table bootstrap window. */
export async function countUsers(db: Db): Promise<number> {
	const row = await db.select({ n: sql<number>`count(*)` }).from(users).get();
	return row?.n ?? 0;
}

/**
 * Look up a user by username (case-sensitive). Returns the FULL row including
 * the hash for server-side verification, or `null` if not found.
 */
export async function getByUsername(db: Db, username: string): Promise<UserRow | null> {
	const row = await db.select().from(users).where(eq(users.username, username)).get();
	return row ?? null;
}

/** Look up a user by id. Returns the FULL row, or `null` if not found. */
export async function getById(db: Db, id: number): Promise<UserRow | null> {
	const row = await db.select().from(users).where(eq(users.id, id)).get();
	return row ?? null;
}

/**
 * Create a user. Returns the new id. The caller is responsible for ensuring the
 * username is unique-friendly; a UNIQUE collision will throw (callers catch it).
 */
export async function createUser(db: Db, input: CreateUserInput): Promise<number> {
	const row = await db
		.insert(users)
		.values({
			username: input.username,
			passwordHash: input.passwordHash,
			mustChangePassword: input.mustChange ? 1 : 0,
			createdAt: Date.now()
		})
		.returning({ id: users.id })
		.get();
	return row.id;
}

/** Update a user's password hash and clear (by default) the must-change flag. */
export async function updatePassword(
	db: Db,
	id: number,
	passwordHash: string,
	mustChange = false
): Promise<void> {
	await db
		.update(users)
		.set({ passwordHash, mustChangePassword: mustChange ? 1 : 0 })
		.where(eq(users.id, id));
}

/** List all users for the admin table (NEVER includes the hash). */
export async function listUsers(db: Db): Promise<UserListItem[]> {
	const rows = await db
		.select({
			id: users.id,
			username: users.username,
			mustChangePassword: users.mustChangePassword,
			createdAt: users.createdAt
		})
		.from(users)
		.orderBy(asc(users.createdAt))
		.all();
	return rows.map((r) => ({
		id: r.id,
		username: r.username,
		mustChange: r.mustChangePassword === 1,
		createdAt: r.createdAt
	}));
}

/** Delete a user by id. */
export async function deleteUser(db: Db, id: number): Promise<void> {
	await db.delete(users).where(eq(users.id, id));
}
