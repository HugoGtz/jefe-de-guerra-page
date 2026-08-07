/**
 * The ONE place core-attribution-by-raid-tag logic lives. Previously
 * `defaultSources()`/`tagToCore()` were each re-derived independently in
 * `getWclData` and `getWclRankings`'s `fetchReportCodes` — every consumer now
 * imports from here instead.
 *
 * `staticTeams` is a hardcoded, immutable import, so module-level memoization
 * is safe for the lifetime of a warm isolate and correct forever (it only
 * changes on redeploy).
 */

import { teams as staticTeams } from '$lib/data/teams';
import type { WclSource, GuildTag } from './types';

export const PARENT_GUILD: WclSource = { wclGuildId: 792187, name: 'General', isParent: true };

/** Every static team that has its own WCL guild object. */
export function coreTeams() {
	return staticTeams.filter(
		(t): t is typeof t & { wclGuildId: number } => typeof t.wclGuildId === 'number'
	);
}

let cachedSources: WclSource[] | null = null;

/** Default aggregate sources for the global queries: parent + every core. */
export function defaultSources(): WclSource[] {
	if (!cachedSources) {
		cachedSources = [
			PARENT_GUILD,
			...coreTeams().map((t) => ({ wclGuildId: t.wclGuildId, name: t.name }))
		];
	}
	return cachedSources;
}

let cachedTagMap: Map<number, { wclGuildId: number; name: string }> | null = null;

/**
 * tagID → core, for cores whose raids are logged on the PARENT guild under a
 * raid-team tag rather than their own guild object. Built from the static teams'
 * `wclTagId`. Lets a parent report be bucketed into the right core.
 */
export function tagToCore(): Map<number, { wclGuildId: number; name: string }> {
	if (!cachedTagMap) {
		const m = new Map<number, { wclGuildId: number; name: string }>();
		for (const t of staticTeams) {
			if (typeof t.wclTagId === 'number' && typeof t.wclGuildId === 'number') {
				m.set(t.wclTagId, { wclGuildId: t.wclGuildId, name: t.name });
			}
		}
		cachedTagMap = m;
	}
	return cachedTagMap;
}

/**
 * Resolve which core a report belongs to. Reports from a core's own guild object
 * map straight to that core; reports from the PARENT are attributed by their
 * raid-team tag (falling back to the parent's "General" bucket when untagged or
 * tagged with an unknown team).
 */
export function resolveCore(
	source: WclSource,
	guildTag: GuildTag,
	tagMap: Map<number, { wclGuildId: number; name: string }> = tagToCore()
): { wclGuildId: number; name: string } {
	if (!source.isParent) return { wclGuildId: source.wclGuildId, name: source.name };
	const tagId = guildTag?.id ?? null;
	if (tagId != null) {
		const core = tagMap.get(tagId);
		if (core) return core;
	}
	return { wclGuildId: source.wclGuildId, name: source.name };
}
