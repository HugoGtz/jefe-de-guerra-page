/**
 * Mutable accumulator for `getWclRankings` (see `./index.ts`): the five
 * parse-ranking structures (Hall of Fame per role, best-parse character map,
 * per-core rosters, per-player histórico, per-boss leaderboard) plus the
 * `consider*` recorders that populate them from each fight. `build(zoneScores)`
 * applies the coherent zoneRankings scores and produces the final `WclRankings`
 * (or null if empty).
 *
 * Pure — no I/O, no D1 — extracted so it's directly unit-testable
 * (`accumulator.test.ts`).
 */

import type { SpecRole } from '$lib/data/officers';
import type {
	WclCharacter,
	WclRecentKill,
	HallOfFameEntry,
	HallOfFame,
	BossLeaderEntry,
	WclRankings
} from '../types';
import {
	CLASS_LABEL_ES,
	CLASS_COLOR,
	CLASS_NAME_TO_CLASS,
	HOF_TOP_N,
	MAX_RECENT_PER_PLAYER
} from '../constants';

export type RankChar = {
	name?: string | null;
	class?: string | null;
	spec?: string | null;
	rankPercent?: number | null;
};

export function createRankingsAccumulator() {
	// best[role] : name(lower) → entry (highest rankPercent kept).
	const best = new Map<SpecRole, Map<string, HallOfFameEntry>>([
		['DPS', new Map()],
		['Healer', new Map()],
		['Tank', new Map()]
	]);
	// name(lower) → best parse across ALL roles (reliable officer enrichment).
	const characters = new Map<string, WclCharacter>();
	// wclGuildId → (name(lower) → best parse within that core). Each core's
	// roster keeps the single best parse per character seen in its reports.
	const rosterByGuild = new Map<number, Map<string, WclCharacter>>();
	// name(lower) → raw recent kills (one per fight the player was in). Deduped,
	// sorted and capped at the end. Powers the player-detail "histórico".
	const recentRaw = new Map<string, WclRecentKill[]>();
	// boss name → (name(lower) → best parse on that boss). Per-boss leaderboard.
	const byBossMap = new Map<string, Map<string, BossLeaderEntry>>();

	/** Record a player's best parse on a given boss (per-boss leaderboard). */
	const considerBoss = (ch: RankChar | null | undefined, boss: string, core: string) => {
		const name = ch?.name?.trim();
		const pct = ch?.rankPercent;
		if (!name || !boss || typeof pct !== 'number' || pct <= 0) return;
		const score = Math.round(pct);
		const key = name.toLowerCase();
		let bucket = byBossMap.get(boss);
		if (!bucket) {
			bucket = new Map<string, BossLeaderEntry>();
			byBossMap.set(boss, bucket);
		}
		const prev = bucket.get(key);
		if (!prev || score > prev.score) {
			const wowClass = ch?.class ? CLASS_NAME_TO_CLASS[ch.class] : undefined;
			bucket.set(key, {
				name,
				wowClass,
				classLabel: wowClass ? CLASS_LABEL_ES[wowClass] : undefined,
				classColor: wowClass ? CLASS_COLOR[wowClass] : undefined,
				spec: ch?.spec ?? undefined,
				core,
				score
			});
		}
	};

	/** Record one fight a player was present in (for the histórico). */
	const recordKill = (
		ch: RankChar | null | undefined,
		boss: string,
		date: string,
		core: string
	) => {
		const name = ch?.name?.trim();
		if (!name || !boss) return;
		const key = name.toLowerCase();
		const list = recentRaw.get(key) ?? [];
		const pct = ch?.rankPercent;
		list.push({
			boss,
			date,
			parse: typeof pct === 'number' && pct > 0 ? Math.round(pct) : null,
			core
		});
		recentRaw.set(key, list);
	};

	const consider = (
		ch: RankChar | null | undefined,
		role: SpecRole,
		core: string,
		guildId: number | undefined
	) => {
		const name = ch?.name?.trim();
		const pct = ch?.rankPercent;
		if (!name || typeof pct !== 'number' || pct <= 0) return;
		const score = Math.round(pct);
		const wowClass = ch?.class ? CLASS_NAME_TO_CLASS[ch.class] : undefined;
		const spec = ch?.spec ?? undefined;
		const key = name.toLowerCase();

		const entry: HallOfFameEntry = {
			name,
			wowClass,
			classLabel: wowClass ? CLASS_LABEL_ES[wowClass] : undefined,
			classColor: wowClass ? CLASS_COLOR[wowClass] : undefined,
			spec,
			role,
			core,
			score
		};
		const bucket = best.get(role)!;
		const prev = bucket.get(key);
		if (!prev || score > prev.score) bucket.set(key, entry);

		// Character map: keep the highest-scoring parse regardless of role, so
		// officer cards show the class/spec/role they actually played.
		const prevChar = characters.get(key);
		if (!prevChar || score > (prevChar.score ?? -1)) {
			characters.set(key, {
				name,
				wowClass,
				classLabel: wowClass ? CLASS_LABEL_ES[wowClass] : undefined,
				classColor: wowClass ? CLASS_COLOR[wowClass] : undefined,
				spec,
				specRole: role,
				score
			});
		}

		// Per-core roster: bucket into the character's core, keeping the best
		// parse per character WITHIN that core (with the class/spec/role of it).
		if (guildId != null) {
			let roster = rosterByGuild.get(guildId);
			if (!roster) {
				roster = new Map<string, WclCharacter>();
				rosterByGuild.set(guildId, roster);
			}
			const prevMember = roster.get(key);
			if (!prevMember || score > (prevMember.score ?? -1)) {
				roster.set(key, {
					name,
					wowClass,
					classLabel: wowClass ? CLASS_LABEL_ES[wowClass] : undefined,
					spec,
					specRole: role,
					score
				});
			}
		}
	};

	/** Names of every character seen (drives the Phase-3 zoneRankings fetch). */
	const characterNames = (): string[] => [...characters.values()].map((c) => c.name);

	/**
	 * Terminal step: apply the coherent zoneRankings scores (falling back to the
	 * report parse for names without one, so no one disappears), then sort/dedupe/
	 * cap every structure into the final `WclRankings`. Null when nothing was seen.
	 */
	const build = (zoneScores: Map<string, number>): WclRankings | null => {
		const scoreFor = (name: string, fallback: number): number =>
			zoneScores.get(name.toLowerCase()) ?? fallback;

		for (const bucket of best.values()) {
			for (const e of bucket.values()) e.score = scoreFor(e.name, e.score);
		}
		for (const c of characters.values()) {
			if (c.score != null) c.score = scoreFor(c.name, c.score);
		}
		for (const roster of rosterByGuild.values()) {
			for (const m of roster.values()) {
				if (m.score != null) m.score = scoreFor(m.name, m.score);
			}
		}

		const top = (role: SpecRole): HallOfFameEntry[] =>
			[...best.get(role)!.values()].sort((a, b) => b.score - a.score).slice(0, HOF_TOP_N);

		const hof: HallOfFame = {
			dps: top('DPS'),
			healers: top('Healer'),
			tanks: top('Tank')
		};
		if (hof.dps.length + hof.healers.length + hof.tanks.length === 0) return null;

		// Per-core rosters: sort each core's members by score descending.
		const rosters: Record<number, WclCharacter[]> = {};
		for (const [guildId, members] of rosterByGuild) {
			rosters[guildId] = [...members.values()].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
		}

		// Per-player histórico: dedupe each player's kills by boss+date (keeping the
		// highest parse), sort newest-first (then by parse), cap per player.
		const recentByPlayer: Record<string, WclRecentKill[]> = {};
		for (const [key, kills] of recentRaw) {
			const byBossDate = new Map<string, WclRecentKill>();
			for (const k of kills) {
				const id = `${k.boss}::${k.date}`;
				const prev = byBossDate.get(id);
				if (!prev || (k.parse ?? -1) > (prev.parse ?? -1)) byBossDate.set(id, k);
			}
			const deduped = [...byBossDate.values()].sort(
				(a, b) =>
					(a.date < b.date ? 1 : a.date > b.date ? -1 : 0) || (b.parse ?? -1) - (a.parse ?? -1)
			);
			recentByPlayer[key] = deduped.slice(0, MAX_RECENT_PER_PLAYER);
		}

		// Per-class leaderboard: group the best-parse character map by class, sort
		// each class's members by score desc, cap at HOF_TOP_N.
		const byClass: Record<string, WclCharacter[]> = {};
		for (const ch of characters.values()) {
			if (!ch.wowClass) continue;
			(byClass[ch.wowClass] ??= []).push(ch);
		}
		for (const cls of Object.keys(byClass)) {
			byClass[cls] = byClass[cls]
				.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
				.slice(0, HOF_TOP_N);
		}

		// Per-boss leaderboard: top N parses per boss, sorted by score desc.
		const byBoss: Record<string, BossLeaderEntry[]> = {};
		for (const [boss, bucket] of byBossMap) {
			byBoss[boss] = [...bucket.values()].sort((a, b) => b.score - a.score).slice(0, HOF_TOP_N);
		}

		return {
			hallOfFame: hof,
			characters: Object.fromEntries(characters),
			rosters,
			recentByPlayer,
			byClass,
			byBoss
		};
	};

	return { consider, considerBoss, recordKill, characterNames, build };
}
