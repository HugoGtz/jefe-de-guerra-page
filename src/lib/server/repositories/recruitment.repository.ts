/**
 * Recruitment repository. Joins the singleton `recruitment_meta` row with its
 * needs and requirements into the `Recruitment` domain model.
 */

import { asc } from 'drizzle-orm';
import type { Db } from '$lib/server/db/client';
import { recruitmentMeta, recruitNeeds, recruitRequirements } from '$lib/server/db/schema';
import type { Recruitment, RecruitNeed } from '$lib/data/recruitment';

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
