/**
 * Recruitment repository. Joins the singleton `recruitment_meta` row with its
 * needs and requirements into the `Recruitment` domain model.
 */

import { asc, eq } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { recruitmentMeta, recruitNeeds, recruitRequirements } from '$lib/server/db/schema';
import type { Recruitment, RecruitNeed } from '$lib/data/recruitment';

/** Editable singleton recruitment meta fields. */
export type RecruitmentMetaUpdate = {
	intro: string;
	discordUrl: string;
	whatsappUrl: string;
};

/**
 * Load recruitment data. Returns `null` when the singleton meta row is missing,
 * so the orchestrator can fall back to static data.
 */
export async function getRecruitment(db: Db): Promise<Recruitment | null> {
	const [meta, needRows, reqRows] = await Promise.all([
		db.select().from(recruitmentMeta).limit(1).get(),
		db.select().from(recruitNeeds).orderBy(asc(recruitNeeds.sort)).all(),
		db.select().from(recruitRequirements).orderBy(asc(recruitRequirements.sort)).all()
	]);

	if (!meta) return null;

	const needs: RecruitNeed[] = needRows.map((n) => ({
		label: n.label,
		priority: n.priority as RecruitNeed['priority']
	}));

	return {
		intro: meta.intro,
		needs,
		requirements: reqRows.map((r) => r.text),
		discordUrl: meta.discordUrl,
		whatsappUrl: meta.whatsappUrl,
		applyWebhookUrl: ''
	};
}

/** Update the singleton recruitment meta (id=1). */
export async function updateRecruitmentMeta(
	db: Db,
	fields: RecruitmentMetaUpdate
): Promise<void> {
	await db
		.update(recruitmentMeta)
		.set({
			intro: fields.intro,
			discordUrl: fields.discordUrl,
			whatsappUrl: fields.whatsappUrl
		})
		.where(eq(recruitmentMeta.id, 1));
}

/** Replace the entire list of recruitment needs, preserving order via `sort`. */
export async function setNeeds(db: Db, needs: RecruitNeed[]): Promise<void> {
	await db.delete(recruitNeeds);
	const rows = needs
		.map((n) => ({ label: n.label.trim(), priority: n.priority }))
		.filter((n) => n.label.length > 0)
		.map((n, i) => ({ label: n.label, priority: n.priority, sort: i }));
	if (rows.length > 0) await db.insert(recruitNeeds).values(rows);
}

/** Replace the entire list of requirements, preserving order via `sort`. */
export async function setRequirements(db: Db, requirements: string[]): Promise<void> {
	await db.delete(recruitRequirements);
	const rows = requirements
		.map((t) => t.trim())
		.filter((t) => t.length > 0)
		.map((text, i) => ({ text, sort: i }));
	if (rows.length > 0) await db.insert(recruitRequirements).values(rows);
}
