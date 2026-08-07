/**
 * Guild applications repository. The public `/api/apply` endpoint posts to a
 * Discord webhook as its critical path (real-time officer notification); this
 * repository is a secondary, best-effort record so applications are also
 * reviewable from the admin panel. Writes never throw — a D1 problem must
 * never break the Discord notification.
 */

import { desc, eq } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { applications } from '$lib/server/db/schema';

/** Fields captured from the public application form. */
export type ApplicationInput = {
	character: string;
	wowClass: string;
	spec: string | null;
	ilvl: string | null;
	logs: string | null;
	experience: string | null;
	availability: string | null;
	message: string | null;
};

/** A stored application, as shown in the admin list. */
export type ApplicationAdmin = ApplicationInput & {
	id: number;
	createdAt: number;
	reviewed: boolean;
};

/** Insert a new application. Best-effort: never throws. */
export async function createApplication(db: Db, input: ApplicationInput): Promise<void> {
	try {
		await db.insert(applications).values({ ...input, createdAt: Date.now() });
	} catch {
		// Best-effort; the Discord webhook is the critical path.
	}
}

/** List every application, newest first. */
export async function listApplicationsAdmin(db: Db): Promise<ApplicationAdmin[]> {
	const rows = await db.select().from(applications).orderBy(desc(applications.createdAt)).all();
	return rows.map((r) => ({
		id: r.id,
		character: r.character,
		wowClass: r.wowClass,
		spec: r.spec,
		ilvl: r.ilvl,
		logs: r.logs,
		experience: r.experience,
		availability: r.availability,
		message: r.message,
		createdAt: r.createdAt,
		reviewed: r.reviewed === 1
	}));
}

/** Mark an application reviewed/pending. */
export async function markApplicationReviewed(
	db: Db,
	id: number,
	reviewed: boolean
): Promise<void> {
	await db
		.update(applications)
		.set({ reviewed: reviewed ? 1 : 0 })
		.where(eq(applications.id, id));
}
