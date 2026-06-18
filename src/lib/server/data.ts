/**
 * Server-side guild data access layer.
 *
 * Reads dynamic guild content from the Cloudflare D1 binding (`platform.env.DB`)
 * and maps the rows back into the exact shapes the UI already consumes (the
 * types defined in `$lib/data/*`). If there is no D1 binding, or any query
 * throws, it falls back to the static constants from `$lib/data/*` so the site
 * keeps working before/without a database.
 */

import { guild as staticGuild, type Guild } from '$lib/data/guild';
import {
	phases as staticPhases,
	type Phase,
	type Raid,
	type Boss
} from '$lib/data/raids';
import { officers as staticOfficers, type Officer } from '$lib/data/officers';
import {
	recruitment as staticRecruitment,
	type Recruitment,
	type RecruitNeed
} from '$lib/data/recruitment';
import { teams as staticTeams, type Team } from '$lib/data/teams';
import { feats as staticFeats, type Feat } from '$lib/data/kills';
import { faq as staticFaq, type FaqItem } from '$lib/data/faq';
import {
	discordServerId as staticDiscordServerId,
	discordInvite as staticDiscordInvite,
	raidTimezone as staticRaidTimezone,
	raidNights as staticRaidNights,
	type RaidNight
} from '$lib/data/community';
import { getWclData, type WclData, type WclFeat } from '$lib/server/warcraftlogs';

/** Guild-wide stats surfaced in the UI, derived from WCL (or manual fallback). */
export type GuildStats = {
	/** Distinct Phase 2 (SSC + TK) bosses down across all cores. */
	phase2BossesDown: number;
	/** Total Phase 2 bosses (SSC 6 + TK 4 = 10). */
	phase2BossesTotal: number;
	/** Number of raid teams (cores). */
	activeCores: number;
	/** Most recent feat, or null if none. */
	lastFeat: { boss: string; date: string; team?: string } | null;
	/** Feats within 30 days of the newest feat date. */
	killsLast30Days: number;
	/** Core with the most SSC+TK kills (name + count), or null. */
	topCore: { name: string; kills: number } | null;
	/** Cores at SSC 6/6 AND TK 4/4. */
	fullClearCores: number;
};

export type GuildData = {
	guild: Guild;
	phases: Phase[];
	officers: Officer[];
	recruitment: Recruitment;
	teams: Team[];
	feats: Feat[];
	faq: FaqItem[];
	stats: GuildStats;
	community: {
		discordServerId: string;
		discordInvite: string;
		raidTimezone: string;
		raidNights: RaidNight[];
	};
};

/** Static fallback assembled from the hardcoded data files. */
function staticFallback(): GuildData {
	return {
		guild: staticGuild,
		phases: staticPhases,
		officers: staticOfficers,
		recruitment: staticRecruitment,
		teams: staticTeams,
		feats: staticFeats,
		faq: staticFaq,
		stats: computeStats(staticPhases, staticFeats, staticTeams, Date.now()),
		community: {
			discordServerId: staticDiscordServerId,
			discordInvite: staticDiscordInvite,
			raidTimezone: staticRaidTimezone,
			raidNights: staticRaidNights
		}
	};
}

// ── Derived-value helpers (mirror raids.ts buildRaid / phasePercent) ─────────

/** Recompute kills/total/percent for a raid from its bosses. */
function withRaidProgress(
	id: string,
	name: string,
	bosses: Boss[],
	abbr?: string
): Raid {
	const total = bosses.length;
	const kills = bosses.filter((b) => b.defeated).length;
	const percent = total === 0 ? 0 : Math.round((kills / total) * 100);
	return { id, name, abbr, bosses, kills, total, percent };
}

/** Global phase percent = bosses killed / total across its raids. */
function phasePercent(raids: Raid[]): number {
	const total = raids.reduce((acc, r) => acc + r.total, 0);
	const kills = raids.reduce((acc, r) => acc + r.kills, 0);
	return total === 0 ? 0 : Math.round((kills / total) * 100);
}

// ── WarcraftLogs integration (live progress + feats, D1-cached) ──────────────

/** How long a cached WCL aggregate stays fresh before we refetch (~20 min). */
const WCL_CACHE_TTL_MS = 20 * 60 * 1000;
const WCL_CACHE_KEY = 'guild';

type WclCacheRow = { json: string; fetched_at: number };

/** English boss name → our Feat raid bucket. Covers Phase 1 + Phase 2 bosses. */
const BOSS_TO_RAID: Record<string, Feat['raid']> = {
	// SSC
	'Hydross the Unstable': 'SSC',
	'The Lurker Below': 'SSC',
	'Leotheras the Blind': 'SSC',
	'Fathom-Lord Karathress': 'SSC',
	'Morogrim Tidewalker': 'SSC',
	'Lady Vashj': 'SSC',
	// TK
	"Al'ar": 'TK',
	'Void Reaver': 'TK',
	'High Astromancer Solarian': 'TK',
	"Kael'thas Sunstrider": 'TK',
	// Karazhan
	'Attumen the Huntsman': 'Karazhan',
	Moroes: 'Karazhan',
	'Maiden of Virtue': 'Karazhan',
	'Opera Event': 'Karazhan',
	'The Curator': 'Karazhan',
	'Terestian Illhoof': 'Karazhan',
	'Shade of Aran': 'Karazhan',
	Netherspite: 'Karazhan',
	'Chess Event': 'Karazhan',
	'Prince Malchezaar': 'Karazhan',
	// Gruul's Lair
	'High King Maulgar': 'Gruul',
	'Gruul the Dragonkiller': 'Gruul',
	// Magtheridon's Lair
	Magtheridon: 'Magtheridon'
};

/** Map a killed boss name to a Feat raid bucket, defaulting to SSC if unknown. */
function raidForBoss(boss: string): Feat['raid'] {
	return BOSS_TO_RAID[boss] ?? 'SSC';
}

/** SSC bosses (English names, as they come from WCL fights). */
const SSC_BOSSES = new Set<string>([
	'Hydross the Unstable',
	'The Lurker Below',
	'Leotheras the Blind',
	'Fathom-Lord Karathress',
	'Morogrim Tidewalker',
	'Lady Vashj'
]);
/** TK (The Eye) bosses. */
const TK_BOSSES = new Set<string>([
	"Al'ar",
	'Void Reaver',
	'High Astromancer Solarian',
	"Kael'thas Sunstrider"
]);
const SSC_TOTAL = 6;
const TK_TOTAL = 4;

/** A WclFeat is serialized to JSON in the cache; reshape into our Feat type. */
function wclFeatToFeat(f: WclFeat): Feat {
	return {
		boss: f.boss,
		raid: raidForBoss(f.boss),
		date: f.date,
		team: f.team,
		firstKill: f.firstKill
	};
}

/**
 * Fetch WCL data with a D1 cache (key='guild', TTL ~20 min). On fetch error,
 * falls back to stale cache if present, otherwise returns null. The cached
 * payload stores `killedBossNames` as an array (Sets aren't JSON-serializable).
 */
async function loadWclCached(platform: App.Platform): Promise<WclData | null> {
	const DB = platform.env.DB;
	const env = platform.env;
	const now = Date.now();

	let cachedRow: WclCacheRow | null = null;
	try {
		cachedRow = await DB.prepare(
			'SELECT json, fetched_at FROM wcl_cache WHERE key = ?'
		)
			.bind(WCL_CACHE_KEY)
			.first<WclCacheRow>();
	} catch {
		// Cache table may not exist yet — proceed to a fresh fetch.
		cachedRow = null;
	}

	const parseRow = (row: WclCacheRow): WclData | null => {
		try {
			const parsed = JSON.parse(row.json) as {
				killedBossNames: string[];
				perCore?: Record<string, string[]>;
				feats: WclFeat[];
			};
			// Coerce string keys (JSON object keys) back to numbers.
			const perCore: Record<number, string[]> = {};
			for (const [k, v] of Object.entries(parsed.perCore ?? {})) {
				perCore[Number(k)] = v;
			}
			return {
				killedBossNames: new Set(parsed.killedBossNames),
				perCore,
				feats: parsed.feats
			};
		} catch {
			return null;
		}
	};

	// Fresh enough → use the cached value.
	if (cachedRow && now - cachedRow.fetched_at < WCL_CACHE_TTL_MS) {
		const fresh = parseRow(cachedRow);
		if (fresh) return fresh;
	}

	// Otherwise fetch live, then upsert the cache.
	const fetched = await getWclData(env);
	if (fetched) {
		try {
			const payload = JSON.stringify({
				killedBossNames: [...fetched.killedBossNames],
				perCore: fetched.perCore,
				feats: fetched.feats
			});
			await DB.prepare(
				'INSERT INTO wcl_cache (key, json, fetched_at) VALUES (?, ?, ?) ' +
					'ON CONFLICT(key) DO UPDATE SET json = excluded.json, fetched_at = excluded.fetched_at'
			)
				.bind(WCL_CACHE_KEY, payload, now)
				.run();
		} catch {
			// Caching is best-effort; ignore write failures.
		}
		return fetched;
	}

	// Fetch failed → use stale cache if we have one.
	if (cachedRow) return parseRow(cachedRow);
	return null;
}

/**
 * Apply live WCL data on top of the base phases/feats:
 *  - Progress: every Phase 2 (SSC/TK) boss gets `defeated` from the union of
 *    killed bosses across cores; raid + phase percentages recomputed.
 *  - Feats: replaced by the WCL-derived feats (mapped to the Feat shape).
 * Returns the (possibly) overridden phases + feats. Never throws.
 */
function applyWclOverride(
	phases: Phase[],
	feats: Feat[],
	wcl: WclData
): { phases: Phase[]; feats: Feat[] } {
	const phase2Ids = new Set(['phase-2']);

	const nextPhases = phases.map((phase) => {
		if (!phase2Ids.has(phase.id)) return phase;
		const raids = phase.raids.map((raid) => {
			const bosses: Boss[] = raid.bosses.map((b) => ({
				name: b.name,
				defeated: wcl.killedBossNames.has(b.name)
			}));
			return withRaidProgress(raid.id, raid.name, bosses, raid.abbr);
		});
		return { ...phase, raids, percent: phasePercent(raids) };
	});

	const nextFeats = wcl.feats.map(wclFeatToFeat);

	return { phases: nextPhases, feats: nextFeats.length > 0 ? nextFeats : feats };
}

/**
 * Override each team's SSC/TK kill counts from its OWN WCL core data. A team is
 * only overridden when its wclGuildId is present in `wcl.perCore` (i.e. WCL
 * returned data for that core); otherwise the manual D1 value is kept.
 */
function applyTeamWclOverride(teams: Team[], wcl: WclData): Team[] {
	return teams.map((team) => {
		if (team.wclGuildId == null) return team;
		const killed = wcl.perCore[team.wclGuildId];
		if (!killed) return team; // No WCL data for this core → keep manual.
		const sscKills = killed.filter((b) => SSC_BOSSES.has(b)).length;
		const tkKills = killed.filter((b) => TK_BOSSES.has(b)).length;
		return {
			...team,
			ssc: { kills: sscKills, total: SSC_TOTAL },
			tk: { kills: tkKills, total: TK_TOTAL }
		};
	});
}

/**
 * Compute guild-wide stats. Derived from the (already WCL-overridden) phases,
 * feats and teams — so it works whether or not WCL was available. Pass the
 * runtime `now` (ms) so module scope stays free of Date.now.
 */
function computeStats(
	phases: Phase[],
	feats: Feat[],
	teams: Team[],
	now: number
): GuildStats {
	// Phase 2 bosses down (union across cores) from the phase-2 raids.
	const phase2 = phases.find((p) => p.id === 'phase-2');
	const phase2BossesDown = phase2
		? phase2.raids.reduce((acc, r) => acc + r.kills, 0)
		: 0;
	const phase2BossesTotal = SSC_TOTAL + TK_TOTAL;

	const activeCores = teams.length;

	// Most recent feat (feats are newest-first, but sort defensively by date).
	const sortedFeats = [...feats].sort((a, b) =>
		a.date < b.date ? 1 : a.date > b.date ? -1 : 0
	);
	const newest = sortedFeats[0] ?? null;
	const lastFeat = newest
		? { boss: newest.boss, date: newest.date, team: newest.team }
		: null;

	// Kills within 30 days of the newest feat date (avoid drifting on stale data).
	let killsLast30Days = 0;
	if (newest) {
		const newestMs = Date.parse(newest.date);
		const ref = Number.isNaN(newestMs) ? now : newestMs;
		const cutoff = ref - 30 * 24 * 60 * 60 * 1000;
		killsLast30Days = sortedFeats.filter((f) => {
			const ms = Date.parse(f.date);
			return !Number.isNaN(ms) && ms >= cutoff;
		}).length;
	}

	// Top core by SSC+TK kills.
	let topCore: GuildStats['topCore'] = null;
	let fullClearCores = 0;
	for (const t of teams) {
		const kills = t.ssc.kills + t.tk.kills;
		if (!topCore || kills > topCore.kills) topCore = { name: t.name, kills };
		if (t.ssc.kills >= SSC_TOTAL && t.tk.kills >= TK_TOTAL) fullClearCores++;
	}
	if (topCore && topCore.kills === 0) topCore = null;

	return {
		phase2BossesDown,
		phase2BossesTotal,
		activeCores,
		lastFeat,
		killsLast30Days,
		topCore,
		fullClearCores
	};
}

// ── Row shapes returned by D1 ────────────────────────────────────────────────

type GuildRow = {
	name: string;
	motto: string;
	badge: string;
	faction: string;
	server: string;
	game: string;
	schedule_days: string;
	schedule_time: string;
	schedule_timezone: string;
	schedule_note: string | null;
};
type AboutRow = { kind: string; text: string };
type PhaseRow = {
	id: string;
	name: string;
	label: string;
	status: string;
	status_label: string;
};
type RaidRow = { id: string; phase_id: string; name: string; abbr: string | null };
type BossRow = { raid_id: string; name: string; defeated: number };
type TeamRow = {
	id: string;
	name: string;
	schedule_days: string;
	schedule_time: string;
	schedule_timezone: string;
	ssc_kills: number;
	ssc_total: number;
	tk_kills: number;
	tk_total: number;
	recruiting: number;
	note: string | null;
	wcl_guild_id: number | null;
};
type OfficerRow = {
	name: string;
	role: string;
	wow_class: string;
	class_label: string;
	line: string;
};
type RecruitMetaRow = { intro: string; discord_url: string; whatsapp_url: string };
type RecruitNeedRow = { label: string; priority: string };
type RecruitReqRow = { text: string };
type FeatRow = {
	boss: string;
	raid: string;
	date: string;
	team: string | null;
	first_kill: number;
};
type FaqRow = { q: string; a: string };
type CommunityMetaRow = { discord_server_id: string; raid_timezone: string };
type RaidNightRow = { team: string | null; weekday: number; time: string };

/**
 * Load all guild data. Uses D1 when the binding is present; otherwise (or on any
 * error) returns the static fallback from `$lib/data/*`.
 */
export async function loadGuildData(
	platform: App.Platform | undefined
): Promise<GuildData> {
	const DB = platform?.env?.DB;
	if (!DB) return staticFallback();

	try {
		const [
			guildRes,
			aboutRes,
			phaseRes,
			raidRes,
			bossRes,
			teamRes,
			officerRes,
			recruitMetaRes,
			needRes,
			reqRes,
			featRes,
			faqRes,
			communityRes,
			nightRes
		] = await Promise.all([
			DB.prepare('SELECT * FROM guild WHERE id = 1').first<GuildRow>(),
			DB.prepare('SELECT kind, text FROM about_paragraphs ORDER BY kind, sort').all<AboutRow>(),
			DB.prepare('SELECT id, name, label, status, status_label FROM phases ORDER BY sort').all<PhaseRow>(),
			DB.prepare('SELECT id, phase_id, name, abbr FROM raids ORDER BY sort').all<RaidRow>(),
			DB.prepare('SELECT raid_id, name, defeated FROM bosses ORDER BY sort').all<BossRow>(),
			DB.prepare('SELECT * FROM teams ORDER BY sort').all<TeamRow>(),
			DB.prepare('SELECT name, role, wow_class, class_label, line FROM officers ORDER BY sort').all<OfficerRow>(),
			DB.prepare('SELECT intro, discord_url, whatsapp_url FROM recruitment_meta WHERE id = 1').first<RecruitMetaRow>(),
			DB.prepare('SELECT label, priority FROM recruit_needs ORDER BY sort').all<RecruitNeedRow>(),
			DB.prepare('SELECT text FROM recruit_requirements ORDER BY sort').all<RecruitReqRow>(),
			DB.prepare('SELECT boss, raid, date, team, first_kill FROM feats ORDER BY sort').all<FeatRow>(),
			DB.prepare('SELECT q, a FROM faq ORDER BY sort').all<FaqRow>(),
			DB.prepare('SELECT discord_server_id, raid_timezone FROM community_meta WHERE id = 1').first<CommunityMetaRow>(),
			DB.prepare('SELECT team, weekday, time FROM raid_nights ORDER BY sort').all<RaidNightRow>()
		]);

		if (!guildRes || !recruitMetaRes || !communityRes) return staticFallback();

		// ── Guild ──
		const aboutRows = aboutRes.results ?? [];
		const guild: Guild = {
			name: guildRes.name,
			motto: guildRes.motto,
			badge: guildRes.badge,
			faction: guildRes.faction,
			server: guildRes.server,
			game: guildRes.game,
			aboutWhoWeAre: aboutRows.filter((r) => r.kind === 'who').map((r) => r.text),
			aboutVibe: aboutRows.filter((r) => r.kind === 'vibe').map((r) => r.text),
			schedule: {
				days: guildRes.schedule_days,
				time: guildRes.schedule_time,
				timezone: guildRes.schedule_timezone,
				note: guildRes.schedule_note ?? undefined
			}
		};

		// ── Phases / raids / bosses (recompute progress) ──
		const bossRows = bossRes.results ?? [];
		const raidRows = raidRes.results ?? [];
		const bossesByRaid = new Map<string, Boss[]>();
		for (const b of bossRows) {
			const list = bossesByRaid.get(b.raid_id) ?? [];
			list.push({ name: b.name, defeated: b.defeated === 1 });
			bossesByRaid.set(b.raid_id, list);
		}
		const raidsByPhase = new Map<string, Raid[]>();
		for (const r of raidRows) {
			const raid = withRaidProgress(
				r.id,
				r.name,
				bossesByRaid.get(r.id) ?? [],
				r.abbr ?? undefined
			);
			const list = raidsByPhase.get(r.phase_id) ?? [];
			list.push(raid);
			raidsByPhase.set(r.phase_id, list);
		}
		const phases: Phase[] = (phaseRes.results ?? []).map((p) => {
			const raids = raidsByPhase.get(p.id) ?? [];
			return {
				id: p.id,
				name: p.name,
				label: p.label,
				status: p.status as Phase['status'],
				statusLabel: p.status_label,
				percent: phasePercent(raids),
				raids
			};
		});

		// ── Officers ──
		const officers: Officer[] = (officerRes.results ?? []).map((o) => ({
			name: o.name,
			role: o.role,
			// Empty strings (unknown class/line) map to undefined → hidden in UI.
			wowClass: (o.wow_class || undefined) as Officer['wowClass'],
			classLabel: o.class_label || undefined,
			line: o.line || undefined
		}));

		// ── Recruitment ──
		const needs: RecruitNeed[] = (needRes.results ?? []).map((n) => ({
			label: n.label,
			priority: n.priority as RecruitNeed['priority']
		}));
		const recruitment: Recruitment = {
			intro: recruitMetaRes.intro,
			needs,
			requirements: (reqRes.results ?? []).map((r) => r.text),
			discordUrl: recruitMetaRes.discord_url,
			whatsappUrl: recruitMetaRes.whatsapp_url,
			applyWebhookUrl: ''
		};

		// ── Teams ──
		const teams: Team[] = (teamRes.results ?? []).map((t) => ({
			id: t.id,
			name: t.name,
			schedule: {
				days: t.schedule_days,
				time: t.schedule_time,
				timezone: t.schedule_timezone
			},
			ssc: { kills: t.ssc_kills, total: t.ssc_total },
			tk: { kills: t.tk_kills, total: t.tk_total },
			recruiting: t.recruiting === 1,
			note: t.note ?? undefined,
			wclGuildId: t.wcl_guild_id ?? undefined
		}));

		// ── Feats ──
		const feats: Feat[] = (featRes.results ?? []).map((f) => ({
			boss: f.boss,
			raid: f.raid as Feat['raid'],
			date: f.date,
			team: f.team ?? undefined,
			firstKill: f.first_kill === 1
		}));

		// ── FAQ ──
		const faq: FaqItem[] = (faqRes.results ?? []).map((f) => ({ q: f.q, a: f.a }));

		// ── Community ──
		const raidNights: RaidNight[] = (nightRes.results ?? []).map((n) => ({
			team: n.team ?? undefined,
			weekday: n.weekday,
			time: n.time
		}));
		const community = {
			discordServerId: communityRes.discord_server_id,
			discordInvite: recruitment.discordUrl,
			raidTimezone: communityRes.raid_timezone,
			raidNights
		};

		// ── WarcraftLogs live override (cached, resilient) ──
		// Attempt to derive Phase 2 progress, per-core progress + recent feats from
		// the guild's WCL logs. Any failure leaves the manual D1 data untouched.
		let outPhases = phases;
		let outFeats = feats;
		let outTeams = teams;
		try {
			const wcl = await loadWclCached(platform!);
			if (wcl) {
				const overridden = applyWclOverride(phases, feats, wcl);
				outPhases = overridden.phases;
				outFeats = overridden.feats;
				outTeams = applyTeamWclOverride(teams, wcl);
			}
		} catch {
			// Keep the manual progress + feats + teams on any WCL error.
		}

		// Stats are derived from whatever data we ended up with (WCL or manual).
		const stats = computeStats(outPhases, outFeats, outTeams, Date.now());

		return {
			guild,
			phases: outPhases,
			officers,
			recruitment,
			teams: outTeams,
			feats: outFeats,
			faq,
			stats,
			community
		};
	} catch {
		return staticFallback();
	}
}
