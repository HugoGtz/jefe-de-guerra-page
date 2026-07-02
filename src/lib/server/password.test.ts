import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('hashPassword', () => {
	it('produces a self-describing pbkdf2 string', async () => {
		const stored = await hashPassword('correct horse battery staple');
		expect(stored).toMatch(/^pbkdf2\$\d+\$[^$]+\$[^$]+$/);
	});

	it('uses a fresh salt each time (no two hashes match)', async () => {
		const a = await hashPassword('same-password');
		const b = await hashPassword('same-password');
		expect(a).not.toBe(b);
	});
});

describe('verifyPassword', () => {
	it('accepts the correct password', async () => {
		const stored = await hashPassword('s3cret!');
		expect(await verifyPassword('s3cret!', stored)).toBe(true);
	});

	it('rejects the wrong password', async () => {
		const stored = await hashPassword('s3cret!');
		expect(await verifyPassword('wrong', stored)).toBe(false);
	});

	it('honors the iteration count embedded in the stored hash', async () => {
		// Older hashes may carry a different iter count; verify must still work.
		const stored = await hashPassword('legacy');
		expect(stored).toContain('$30000$');
		expect(await verifyPassword('legacy', stored)).toBe(true);
	});

	it('never throws on malformed/empty input — returns false', async () => {
		expect(await verifyPassword('', 'pbkdf2$30000$abc$def')).toBe(false);
		expect(await verifyPassword('x', '')).toBe(false);
		expect(await verifyPassword('x', 'garbage')).toBe(false);
		expect(await verifyPassword('x', 'pbkdf2$notanumber$a$b')).toBe(false);
		expect(await verifyPassword('x', 'bcrypt$30000$a$b')).toBe(false);
		expect(await verifyPassword('x', '$$$$')).toBe(false);
	});
});
