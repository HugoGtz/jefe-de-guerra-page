import { officers as staticOfficers } from '$lib/data/officers';
import type { WclEnv, WclCharacter } from './types';
import { getToken, gql } from './http';
import { buildCharacterQuery, toWclCharacter, type CharacterNode } from './characterLookup';
import { logWcl } from './logging';

/**
 * Enrich officers with class / spec / parse score from WCL. Batches ALL officer
 * names into a single aliased query. Names that don't resolve are simply
 * omitted from the result map (caller keeps name+role only). Resilient: any
 * failure → null.
 *
 * @returns Map keyed by officer name → WclCharacter, or null on failure.
 */
export async function getWclOfficers(
	env: WclEnv,
	names?: string[]
): Promise<Record<string, WclCharacter> | null> {
	try {
		const list = names ?? staticOfficers.map((o) => o.name);
		if (list.length === 0) return null;

		const token = await getToken(env);
		if (!token) return null;

		const data = await gql<Record<string, { character: CharacterNode }>>(
			token,
			buildCharacterQuery(list)
		);
		if (!data) return null;

		const out: Record<string, WclCharacter> = {};
		list.forEach((name, i) => {
			const node = data[`c${i}`]?.character ?? null;
			if (!node) return; // Unresolved name → skip (officer shows name+role only).
			const ch = toWclCharacter(name, node);
			// Only include if we learned anything useful.
			if (ch.wowClass || ch.spec || ch.score != null) out[name] = ch;
		});
		return out;
	} catch (e) {
		logWcl('getWclOfficers', { error: e instanceof Error ? e.message : String(e) });
		return null;
	}
}
