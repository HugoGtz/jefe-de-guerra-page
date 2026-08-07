/**
 * Guild progress rank (world / region / server).
 *
 * Source: `guildData.guild(id).zoneRanking(zoneId:1056).progress(size:25)`, the
 * authoritative world/region/server progress rank for the guild in SSC/TK — no
 * report scanning. NOTE: ranks are per GUILD OBJECT, so a core whose logs live
 * on the parent (e.g. Core 4) has no own-guild rank; the parent's rank is the
 * whole-guild figure. Raid size 25 is required for Classic.
 */

import type { WclEnv, WclSource, WclRankTriple, WclProgress } from './types';
import { SSC_TK_ZONE_ID, RAID_SIZE } from './constants';
import { getToken, gql } from './http';
import { defaultSources } from './core-attribution';
import { logWcl } from './logging';

type RankNode = { number?: number | null } | null;
type ProgressNode = {
	zoneRanking?: {
		progress?: {
			worldRank?: RankNode;
			regionRank?: RankNode;
			serverRank?: RankNode;
		} | null;
	} | null;
} | null;

/** Coerce a rank node's `number` to a positive int, else null. */
function rankNum(node: RankNode | undefined): number | null {
	const n = node?.number;
	return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function toRankTriple(p: ProgressNode): WclRankTriple | null {
	const pr = p?.zoneRanking?.progress;
	if (!pr) return null;
	const triple = {
		world: rankNum(pr.worldRank),
		region: rankNum(pr.regionRank),
		server: rankNum(pr.serverRank)
	};
	if (triple.world == null && triple.region == null && triple.server == null) return null;
	return triple;
}

/** Build the batched progress query: one aliased guild block per source. */
function buildProgressQuery(guildIds: number[]): string {
	const blocks = guildIds
		.map(
			(id, i) => `p${i}: guildData {
    guild(id: ${id}) {
      zoneRanking(zoneId: ${SSC_TK_ZONE_ID}) {
        progress(size: ${RAID_SIZE}) {
          worldRank { number }
          regionRank { number }
          serverRank { number }
        }
      }
    }
  }`
		)
		.join('\n  ');
	return `query {\n  ${blocks}\n}`;
}

/**
 * Fetch the guild + per-core progress rank (world/region/server) for SSC/TK in a
 * single batched query. Resilient: missing creds / any error → null. The parent
 * source provides the whole-guild rank; per-core ranks are only present for cores
 * whose own guild object is ranked.
 */
export async function getWclProgress(
	env: WclEnv,
	cores?: WclSource[]
): Promise<WclProgress | null> {
	try {
		const list = cores ?? defaultSources();
		if (list.length === 0) return null;

		const token = await getToken(env);
		if (!token) return null;

		const guildIds = list.map((c) => c.wclGuildId);
		const data = await gql<Record<string, ProgressNode>>(token, buildProgressQuery(guildIds));
		if (!data) return null;

		let guild: WclRankTriple | null = null;
		const perCore: Record<number, WclRankTriple> = {};
		list.forEach((source, i) => {
			const triple = toRankTriple(data[`p${i}`] ?? null);
			if (!triple) return;
			if (source.isParent) guild = triple;
			else perCore[source.wclGuildId] = triple;
		});

		if (!guild && Object.keys(perCore).length === 0) return null;
		return { guild, perCore };
	} catch (e) {
		logWcl('getWclProgress', { error: e instanceof Error ? e.message : String(e) });
		return null;
	}
}
