import { describe, it, expect, afterEach, vi } from 'vitest';
import { checkPassword, createSession, verifySession, SESSION_MAX_AGE_S } from './auth';

const env = { ADMIN_PASSWORD: 'correct horse battery staple' };

afterEach(() => vi.restoreAllMocks());

describe('checkPassword', () => {
	it('accepts the exact password', () => {
		expect(checkPassword('correct horse battery staple', env)).toBe(true);
	});

	it('rejects a wrong password', () => {
		expect(checkPassword('nope', env)).toBe(false);
	});

	it('fails closed when ADMIN_PASSWORD is unset', () => {
		expect(checkPassword('anything', {})).toBe(false);
	});

	it('rejects empty input', () => {
		expect(checkPassword('', env)).toBe(false);
	});
});

describe('createSession / verifySession', () => {
	it('round-trips a valid token back to its uid', async () => {
		const token = await createSession(42, env);
		expect(token).toBeTypeOf('string');
		expect(await verifySession(token, env)).toEqual({ uid: 42 });
	});

	it('returns null when no ADMIN_PASSWORD (cannot sign / verify)', async () => {
		expect(await createSession(1, {})).toBeNull();
		const token = await createSession(1, env);
		expect(await verifySession(token, {})).toBeNull();
	});

	it('rejects a token signed with a different password', async () => {
		const token = await createSession(7, env);
		expect(await verifySession(token, { ADMIN_PASSWORD: 'other-key' })).toBeNull();
	});

	it('rejects a tampered signature', async () => {
		const token = await createSession(7, env);
		const bad = token!.slice(0, -1) + (token!.at(-1) === 'a' ? 'b' : 'a');
		expect(await verifySession(bad, env)).toBeNull();
	});

	it('rejects a tampered payload (uid swap breaks the HMAC)', async () => {
		const token = await createSession(7, env);
		const [, sig] = token!.split('.');
		const forgedPayload = Buffer.from(JSON.stringify({ uid: 999, exp: Date.now() + 100000 }))
			.toString('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');
		expect(await verifySession(`${forgedPayload}.${sig}`, env)).toBeNull();
	});

	it('rejects an expired token', async () => {
		const nowSpy = vi.spyOn(Date, 'now');
		nowSpy.mockReturnValue(1_000_000);
		const token = await createSession(5, env);
		// Jump past the 7-day lifetime.
		nowSpy.mockReturnValue(1_000_000 + SESSION_MAX_AGE_S * 1000 + 1);
		expect(await verifySession(token, env)).toBeNull();
	});

	it('rejects malformed / empty tokens', async () => {
		expect(await verifySession(null, env)).toBeNull();
		expect(await verifySession(undefined, env)).toBeNull();
		expect(await verifySession('', env)).toBeNull();
		expect(await verifySession('no-dot', env)).toBeNull();
		expect(await verifySession('.sigonly', env)).toBeNull();
	});
});
