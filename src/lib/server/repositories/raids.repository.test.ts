import { describe, it, expect } from 'vitest';
import { withRaidProgress, phasePercent } from './raids.repository';
import type { Boss } from '$lib/data/raids';

const bosses = (defeated: boolean[]): Boss[] =>
	defeated.map((d, i) => ({ name: `Boss ${i}`, defeated: d }));

describe('withRaidProgress', () => {
	it('counts kills and rounds the percent', () => {
		const raid = withRaidProgress('ssc', 'SSC', bosses([true, true, false]), 'SSC');
		expect(raid).toMatchObject({ id: 'ssc', name: 'SSC', abbr: 'SSC', kills: 2, total: 3 });
		expect(raid.percent).toBe(67); // 2/3 → 66.6 → 67
	});

	it('is 0% with no kills and 100% fully cleared', () => {
		expect(withRaidProgress('a', 'A', bosses([false, false])).percent).toBe(0);
		expect(withRaidProgress('b', 'B', bosses([true, true])).percent).toBe(100);
	});

	it('handles an empty boss list without dividing by zero', () => {
		const raid = withRaidProgress('empty', 'Empty', []);
		expect(raid).toMatchObject({ kills: 0, total: 0, percent: 0 });
	});
});

describe('phasePercent', () => {
	it('aggregates kills/total across raids (not an average of percents)', () => {
		const r1 = withRaidProgress('a', 'A', bosses([true, true, true, true, true, true])); // 6/6
		const r2 = withRaidProgress('b', 'B', bosses([true, false, false, false])); // 1/4
		// 7 of 10 total → 70%, not (100+25)/2.
		expect(phasePercent([r1, r2])).toBe(70);
	});

	it('is 0 when there are no bosses anywhere', () => {
		expect(phasePercent([withRaidProgress('a', 'A', [])])).toBe(0);
		expect(phasePercent([])).toBe(0);
	});
});
