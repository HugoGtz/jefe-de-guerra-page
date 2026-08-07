import { describe, it, expect } from 'vitest';
import { mergeLedger, pairsFromLive } from './wcl-boss-ledger';
import type { WclData } from '$lib/server/wcl';
import type { BossKillRow } from './repositories/wclBossKills.repository';

const CORE_4_GUILD_ID = 826907;

function liveData(perCore: Record<number, string[]>): WclData {
	return {
		killedBossNames: new Set(Object.values(perCore).flat()),
		perCore,
		feats: []
	};
}

describe('mergeLedger', () => {
	it("regression: a kill persisted in the ledger survives even when this cycle's live fetch no longer contains it", () => {
		// This is the exact bug that was reported: Core 4 killed Lady Vashj weeks
		// ago, but the live fetch only looks at the most recent N reports (any
		// zone) — by the time this cycle runs, that old report has aged out of
		// the window and the live result no longer mentions the kill at all.
		const persisted: BossKillRow[] = [
			{
				coreWclGuildId: CORE_4_GUILD_ID,
				boss: 'Lady Vashj',
				tier: 'p2-ssc-tk',
				firstSeenAt: 0,
				lastSeenAt: 0
			}
		];
		const liveThisCycle = liveData({ [CORE_4_GUILD_ID]: [] }); // aged out — no longer seen live

		const merged = mergeLedger(persisted, liveThisCycle);

		expect(merged.perCore[CORE_4_GUILD_ID]).toContain('Lady Vashj');
		expect(merged.killedBossNames.has('Lady Vashj')).toBe(true);
	});

	it('unions persisted and live kills for the same core without duplicates', () => {
		const persisted: BossKillRow[] = [
			{ coreWclGuildId: 1, boss: "Al'ar", tier: 'p2-ssc-tk', firstSeenAt: 0, lastSeenAt: 0 }
		];
		const live = liveData({ 1: ["Al'ar", 'Void Reaver'] });

		const merged = mergeLedger(persisted, live);

		expect(merged.perCore[1].sort()).toEqual(["Al'ar", 'Void Reaver']);
	});

	it('keeps different cores separate', () => {
		const persisted: BossKillRow[] = [
			{
				coreWclGuildId: 1,
				boss: 'Hydross the Unstable',
				tier: 'p2-ssc-tk',
				firstSeenAt: 0,
				lastSeenAt: 0
			}
		];
		const live = liveData({ 2: ['The Lurker Below'] });

		const merged = mergeLedger(persisted, live);

		expect(merged.perCore[1]).toEqual(['Hydross the Unstable']);
		expect(merged.perCore[2]).toEqual(['The Lurker Below']);
	});

	it('handles a null live fetch (total WCL failure) by falling back to persisted-only', () => {
		const persisted: BossKillRow[] = [
			{
				coreWclGuildId: 1,
				boss: 'Morogrim Tidewalker',
				tier: 'p2-ssc-tk',
				firstSeenAt: 0,
				lastSeenAt: 0
			}
		];

		const merged = mergeLedger(persisted, null);

		expect(merged.perCore[1]).toEqual(['Morogrim Tidewalker']);
	});

	it('returns empty structures (not a throw) when both sources are empty', () => {
		const merged = mergeLedger([], null);
		expect(merged.perCore).toEqual({});
		expect(merged.killedBossNames.size).toBe(0);
	});
});

describe('pairsFromLive', () => {
	it('only includes bosses in the relevant set, filtering out other-phase content', () => {
		const live = liveData({ 1: ['Lady Vashj', 'Attumen the Huntsman'] });
		const relevant = new Set(['Lady Vashj']);

		const pairs = pairsFromLive(live, relevant);

		expect(pairs).toEqual([{ coreWclGuildId: 1, boss: 'Lady Vashj' }]);
	});

	it('returns no pairs when perCore is empty', () => {
		expect(pairsFromLive(liveData({}), new Set(['Lady Vashj']))).toEqual([]);
	});
});
