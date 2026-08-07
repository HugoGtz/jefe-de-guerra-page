import { describe, it, expect } from 'vitest';
import { createRankingsAccumulator } from './accumulator';

describe('createRankingsAccumulator', () => {
	it('returns null when nothing was ever considered', () => {
		const acc = createRankingsAccumulator();
		expect(acc.build(new Map())).toBeNull();
	});

	it('keeps the highest-scoring parse per character per role', () => {
		const acc = createRankingsAccumulator();
		acc.consider({ name: 'Foo', class: 'Mage', rankPercent: 40 }, 'DPS', 'Core 1', 1);
		acc.consider({ name: 'Foo', class: 'Mage', rankPercent: 90 }, 'DPS', 'Core 1', 1);
		acc.consider({ name: 'Foo', class: 'Mage', rankPercent: 10 }, 'DPS', 'Core 1', 1);

		const result = acc.build(new Map());
		expect(result?.hallOfFame.dps).toHaveLength(1);
		expect(result?.hallOfFame.dps[0]).toMatchObject({ name: 'Foo', score: 90, core: 'Core 1' });
	});

	it('buckets per-core rosters independently by wclGuildId', () => {
		const acc = createRankingsAccumulator();
		acc.consider({ name: 'Bar', class: 'Warrior', rankPercent: 50 }, 'Tank', 'Core 1', 1);
		acc.consider({ name: 'Bar', class: 'Warrior', rankPercent: 80 }, 'Tank', 'Core 2', 2);

		const result = acc.build(new Map());
		expect(result?.rosters[1]?.[0]).toMatchObject({ name: 'Bar', score: 50 });
		expect(result?.rosters[2]?.[0]).toMatchObject({ name: 'Bar', score: 80 });
	});

	it('considerBoss builds a per-boss leaderboard keeping the best parse', () => {
		const acc = createRankingsAccumulator();
		acc.considerBoss({ name: 'Baz', class: 'Priest', rankPercent: 30 }, 'Lady Vashj', 'Core 1');
		acc.considerBoss({ name: 'Baz', class: 'Priest', rankPercent: 70 }, 'Lady Vashj', 'Core 1');

		// considerBoss alone doesn't populate the Hall of Fame, so also `consider`
		// once to make build() return non-null and expose byBoss.
		acc.consider({ name: 'Baz', class: 'Priest', rankPercent: 70 }, 'Healer', 'Core 1', 1);

		const result = acc.build(new Map());
		expect(result?.byBoss?.['Lady Vashj']).toEqual([
			expect.objectContaining({ name: 'Baz', score: 70 })
		]);
	});

	it('recordKill dedupes by boss+date keeping the highest parse and sorts newest-first', () => {
		const acc = createRankingsAccumulator();
		acc.consider({ name: 'Qux', class: 'Hunter', rankPercent: 60 }, 'DPS', 'Core 1', 1);
		acc.recordKill({ name: 'Qux', rankPercent: 40 }, "Al'ar", '2026-01-01', 'Core 1');
		acc.recordKill({ name: 'Qux', rankPercent: 90 }, "Al'ar", '2026-01-01', 'Core 1');
		acc.recordKill({ name: 'Qux', rankPercent: 20 }, 'Void Reaver', '2026-01-05', 'Core 1');

		const result = acc.build(new Map());
		const recent = result?.recentByPlayer?.['qux'];
		expect(recent).toHaveLength(2);
		expect(recent?.[0]).toMatchObject({ boss: 'Void Reaver', date: '2026-01-05' });
		expect(recent?.[1]).toMatchObject({ boss: "Al'ar", date: '2026-01-01', parse: 90 });
	});

	it('build() overrides the report-parse score with the coherent zoneRankings score when present', () => {
		const acc = createRankingsAccumulator();
		acc.consider({ name: 'Zap', class: 'Shaman', rankPercent: 55 }, 'Healer', 'Core 1', 1);

		const result = acc.build(new Map([['zap', 95]]));
		expect(result?.hallOfFame.healers[0]).toMatchObject({ name: 'Zap', score: 95 });
		expect(result?.characters['zap']).toMatchObject({ score: 95 });
	});

	it('characterNames lists every distinct character seen', () => {
		const acc = createRankingsAccumulator();
		acc.consider({ name: 'A', rankPercent: 10 }, 'DPS', 'Core 1', 1);
		acc.consider({ name: 'B', rankPercent: 10 }, 'DPS', 'Core 1', 1);
		expect(acc.characterNames().sort()).toEqual(['A', 'B']);
	});
});
