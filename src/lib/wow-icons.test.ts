import { describe, it, expect } from 'vitest';
import { specOrClassIcon, classColor, playerHref, CLASS_COLORS } from './wow-icons';

describe('specOrClassIcon', () => {
	it('returns the spec icon when class + spec resolve', () => {
		expect(specOrClassIcon('Warrior', 'fury')).toBe('/icons/spec/warrior/fury.png');
	});

	it('falls back to the class icon when the spec is missing/unknown', () => {
		expect(specOrClassIcon('Warrior', undefined)).toBe('/icons/class/warrior.png');
		expect(specOrClassIcon('Warrior', 'not-a-spec')).toBe('/icons/class/warrior.png');
	});

	it('returns null when the class cannot be resolved', () => {
		expect(specOrClassIcon(null, null)).toBeNull();
		expect(specOrClassIcon('Notaclass', 'fury')).toBeNull();
	});
});

describe('classColor', () => {
	it('resolves the canonical color regardless of case', () => {
		expect(classColor('Mage')).toBe(CLASS_COLORS.mage);
		expect(classColor('WARLOCK')).toBe(CLASS_COLORS.warlock);
	});

	it('returns undefined for unknown/empty input', () => {
		expect(classColor(undefined)).toBeUndefined();
		expect(classColor('')).toBeUndefined();
		expect(classColor('Bard')).toBeUndefined();
	});
});

describe('playerHref', () => {
	it('builds a URL-safe internal player route', () => {
		expect(playerHref('Thrall')).toBe('/jugador/Thrall');
		expect(playerHref('Áedan the Bold')).toBe('/jugador/%C3%81edan%20the%20Bold');
	});
});
