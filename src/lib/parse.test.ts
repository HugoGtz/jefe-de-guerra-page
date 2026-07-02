import { describe, it, expect } from 'vitest';
import { parseTier, parseColor, roleLabelEs, formatDuration } from './parse';

describe('parseTier', () => {
	it('maps each score to its WCL tier at the lower boundary', () => {
		expect(parseTier(99).label).toBe('Legendario');
		expect(parseTier(95).label).toBe('Insano');
		expect(parseTier(75).label).toBe('Épico');
		expect(parseTier(50).label).toBe('Raro');
		expect(parseTier(25).label).toBe('Común');
		expect(parseTier(0).label).toBe('Pobre');
	});

	it('treats boundaries as inclusive lower bounds (one below = next tier down)', () => {
		expect(parseTier(98).label).toBe('Insano');
		expect(parseTier(94).label).toBe('Épico');
		expect(parseTier(74).label).toBe('Raro');
		expect(parseTier(49).label).toBe('Común');
		expect(parseTier(24).label).toBe('Pobre');
	});
});

describe('parseColor', () => {
	it('returns just the tier color', () => {
		expect(parseColor(99)).toBe('#e5cc80');
		expect(parseColor(10)).toBe('#9d9d9d');
	});
});

describe('roleLabelEs', () => {
	it('localizes combat roles', () => {
		expect(roleLabelEs('Healer')).toBe('Sanador');
		expect(roleLabelEs('Tank')).toBe('Tanque');
		expect(roleLabelEs('DPS')).toBe('DPS');
	});
});

describe('formatDuration', () => {
	it('formats milliseconds as m:ss with zero-padded seconds', () => {
		expect(formatDuration(271299)).toBe('4:31');
		expect(formatDuration(65000)).toBe('1:05');
	});

	it('returns null for missing/zero/invalid durations', () => {
		expect(formatDuration(0)).toBeNull();
		expect(formatDuration(-5)).toBeNull();
		expect(formatDuration(null)).toBeNull();
		expect(formatDuration(undefined)).toBeNull();
		expect(formatDuration(Number.NaN)).toBeNull();
	});
});
