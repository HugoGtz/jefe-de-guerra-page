import { describe, it, expect } from 'vitest';
import { rankText, amountText, dateText } from './playerFormat';

describe('rankText', () => {
	it('prefixes the rank with # (thousands grouping is delegated to the es-ES locale)', () => {
		expect(rankText(7)).toBe('#7');
		// The grouping separator depends on the runtime's ICU data, so assert the
		// prefix + digits rather than the exact separator.
		expect(rankText(1234).replace(/[.,\s]/g, '')).toBe('#1234');
	});
	it('shows a dash when unranked', () => {
		expect(rankText(null)).toBe('—');
	});
});

describe('amountText', () => {
	it('compacts thousands and drops a trailing .0', () => {
		expect(amountText(12300)).toBe('12.3 k');
		expect(amountText(5000)).toBe('5 k');
	});
	it('leaves sub-1000 values raw and handles null', () => {
		expect(amountText(950)).toBe('950');
		expect(amountText(null)).toBe('—');
	});
});

describe('dateText', () => {
	it('formats an ISO date in Spanish', () => {
		expect(dateText('2026-06-05')).toBe('5 jun 2026');
		expect(dateText('2026-12-31')).toBe('31 dic 2026');
	});
	it('passes through malformed input', () => {
		expect(dateText('nope')).toBe('nope');
	});
});
