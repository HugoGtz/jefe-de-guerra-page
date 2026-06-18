/**
 * WarcraftLogs API integration (server-only).
 *
 * Derives the guild's live raid progress and recent feats from the WCL logs of
 * the 7 Cores (parent guild "Jefe de Guerra", Fresh/Anniversary Classic).
 *
 * Flow:
 *  1. OAuth client-credentials → bearer token (cached at module level w/ expiry).
 *  2. One batched GraphQL query across all 7 core guild IDs (GraphQL aliases).
 *  3. Aggregate killed boss names (union across cores) + build deduped feats.
 *
 * Everything is resilient: missing creds or any error → returns `null` so the
 * caller falls back to the manual D1/static data. No top-level side effects;
 * all network/Date use happens inside the functions (SSR runtime only).
 */

import { teams as staticTeams } from '$lib/data/teams';

const OAUTH_URL = 'https://www.warcraftlogs.com/oauth/token';
const GRAPHQL_URL = 'https://fresh.warcraftlogs.com/api/v2/client';

/** Reports fetched per guild per query. */
const REPORTS_PER_GUILD = 25;
/** Max feats returned (most recent first-kills/kills). */
const MAX_FEATS = 10;

export type WclFeat = {
	boss: string;
	/** ISO 'yyyy-mm-dd' derived from the report startTime. */
	date: string;
	/** Display name of the core that got the kill (e.g. "Core 1"). */
	team: string;
	encounterID: number;
	/** True for the earliest occurrence of this boss across ALL cores. */
	firstKill: boolean;
};

export type WclData = {
	/** Union of every boss name killed across all cores. */
	killedBossNames: Set<string>;
	/** Per-core (wclGuildId → killed boss names) so each Core card shows ITS progress. */
	perCore: Record<number, string[]>;
	feats: WclFeat[];
};

type WclEnv = {
	WCL_CLIENT_ID?: string;
	WCL_CLIENT_SECRET?: string;
};

// ── OAuth token cache (module-level) ─────────────────────────────────────────

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(env: WclEnv): Promise<string | null> {
	const { WCL_CLIENT_ID, WCL_CLIENT_SECRET } = env;
	if (!WCL_CLIENT_ID || !WCL_CLIENT_SECRET) return null;

	// Reuse the cached token until ~60s before it expires.
	if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
		return cachedToken.value;
	}

	const basic = btoa(`${WCL_CLIENT_ID}:${WCL_CLIENT_SECRET}`);
	const res = await fetch(OAUTH_URL, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${basic}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: 'grant_type=client_credentials'
	});
	if (!res.ok) return null;

	const json = (await res.json()) as { access_token?: string; expires_in?: number };
	if (!json.access_token) return null;

	const ttlMs = (json.expires_in ?? 3600) * 1000;
	cachedToken = { value: json.access_token, expiresAt: Date.now() + ttlMs };
	return cachedToken.value;
}

// ── GraphQL query shape ──────────────────────────────────────────────────────

type FightNode = { name: string; encounterID: number };
type ReportNode = {
	code: string;
	title: string;
	startTime: number;
	zone: { id: number; name: string } | null;
	fights: FightNode[];
};
type GuildReports = { reports: { data: ReportNode[] } };

/** Build the batched query: one aliased `reportData` block per guild ID. */
function buildBatchedQuery(guildIds: number[]): string {
	const blocks = guildIds
		.map(
			(id, i) => `g${i}: reportData {
    reports(guildID: ${id}, limit: ${REPORTS_PER_GUILD}) {
      data {
        code
        title
        startTime
        zone { id name }
        fights(killType: Kills) { name encounterID }
      }
    }
  }`
		)
		.join('\n  ');
	return `query {\n  ${blocks}\n}`;
}

function toIsoDate(epochMs: number): string {
	return new Date(epochMs).toISOString().slice(0, 10);
}

/**
 * Fetch + aggregate live progress and feats from WCL for the given core guilds.
 *
 * @param env  Object with WCL_CLIENT_ID / WCL_CLIENT_SECRET (from platform.env).
 * @param cores Optional list of { wclGuildId, name } cores; defaults to the
 *              static teams that have a wclGuildId.
 * @returns Aggregated data, or `null` if creds are missing or anything fails.
 */
export async function getWclData(
	env: WclEnv,
	cores?: { wclGuildId: number; name: string }[]
): Promise<WclData | null> {
	try {
		const list =
			cores ??
			staticTeams
				.filter((t): t is typeof t & { wclGuildId: number } => typeof t.wclGuildId === 'number')
				.map((t) => ({ wclGuildId: t.wclGuildId, name: t.name }));
		if (list.length === 0) return null;

		const token = await getToken(env);
		if (!token) return null;

		const guildIds = list.map((c) => c.wclGuildId);
		const idToName = new Map(list.map((c) => [c.wclGuildId, c.name]));

		const res = await fetch(GRAPHQL_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ query: buildBatchedQuery(guildIds) })
		});
		if (!res.ok) return null;

		const json = (await res.json()) as {
			data?: Record<string, GuildReports>;
			errors?: unknown;
		};
		if (!json.data) return null;

		const killedBossNames = new Set<string>();
		// wclGuildId → set of killed boss names for that single core.
		const perCoreSets = new Map<number, Set<string>>();
		// boss+core → earliest kill candidate (one feat per boss per core).
		const perBossCore = new Map<string, WclFeat>();

		guildIds.forEach((id, i) => {
			const block = json.data?.[`g${i}`];
			const reports = block?.reports?.data ?? [];
			const team = idToName.get(id) ?? `Core ${i + 1}`;
			let coreSet = perCoreSets.get(id);
			if (!coreSet) {
				coreSet = new Set<string>();
				perCoreSets.set(id, coreSet);
			}
			for (const report of reports) {
				const date = toIsoDate(report.startTime);
				for (const fight of report.fights ?? []) {
					if (!fight?.name) continue;
					killedBossNames.add(fight.name);
					coreSet.add(fight.name);

					const key = `${fight.name}::${team}`;
					const existing = perBossCore.get(key);
					// Keep the EARLIEST date for this boss+core (first kill for the core).
					if (!existing || date < existing.date) {
						perBossCore.set(key, {
							boss: fight.name,
							date,
							team,
							encounterID: fight.encounterID,
							firstKill: false
						});
					}
				}
			}
		});

		const feats = [...perBossCore.values()];

		// Mark firstKill on the earliest occurrence of each boss across ALL cores.
		const earliestByBoss = new Map<string, WclFeat>();
		for (const f of feats) {
			const cur = earliestByBoss.get(f.boss);
			if (!cur || f.date < cur.date) earliestByBoss.set(f.boss, f);
		}
		for (const f of earliestByBoss.values()) f.firstKill = true;

		// Most recent first, then take the top N.
		feats.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

		const perCore: Record<number, string[]> = {};
		for (const [id, set] of perCoreSets) perCore[id] = [...set];

		return { killedBossNames, perCore, feats: feats.slice(0, MAX_FEATS) };
	} catch {
		return null;
	}
}
