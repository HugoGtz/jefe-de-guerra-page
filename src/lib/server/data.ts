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

export type GuildData = {
	guild: Guild;
	phases: Phase[];
	officers: Officer[];
	recruitment: Recruitment;
	teams: Team[];
	feats: Feat[];
	faq: FaqItem[];
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
			wowClass: o.wow_class as Officer['wowClass'],
			classLabel: o.class_label,
			line: o.line
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
			note: t.note ?? undefined
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

		return { guild, phases, officers, recruitment, teams, feats, faq, community };
	} catch {
		return staticFallback();
	}
}
