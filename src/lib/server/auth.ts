/**
 * Admin session auth — the SECURITY BOUNDARY for the /admin panel.
 *
 * Stateless signed sessions: a token is `base64url(payload).hexHmac` where the
 * payload is `{ exp }` (epoch ms, +7 days) and the HMAC-SHA256 key is derived
 * from `env.ADMIN_PASSWORD`. No separate secret is needed; rotating the password
 * invalidates every outstanding session for free.
 *
 * Everything FAILS CLOSED: if `ADMIN_PASSWORD` is unset there is no key, so
 * `checkPassword` rejects and `verifySession` cannot validate any token.
 *
 * Runs on WebCrypto (Cloudflare Workers + Node 22 dev) — no Node `crypto`.
 */

import type { D1Database } from '@cloudflare/workers-types';

/** Cookie name holding the signed admin session token. */
export const SESSION_COOKIE = 'jdg_admin';

/** Session lifetime in seconds (7 days). Mirror this in the cookie maxAge. */
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7;

/** Minimal env shape this module needs (avoids importing the full Platform). */
type AuthEnv = { ADMIN_PASSWORD?: string; DB?: D1Database };

const encoder = new TextEncoder();

// ── Encoding helpers ─────────────────────────────────────────────────────────

/** base64url-encode a UTF-8 string (no padding). */
function base64urlEncode(input: string): string {
	const bytes = encoder.encode(input);
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** base64url-decode back to a UTF-8 string. Returns null on malformed input. */
function base64urlDecode(input: string): string | null {
	try {
		const padded = input.replace(/-/g, '+').replace(/_/g, '/');
		const binary = atob(padded);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		return new TextDecoder().decode(bytes);
	} catch {
		return null;
	}
}

/** Lowercase hex-encode a byte buffer. */
function toHex(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let hex = '';
	for (const b of bytes) hex += b.toString(16).padStart(2, '0');
	return hex;
}

// ── Crypto primitives ────────────────────────────────────────────────────────

/**
 * Import the HMAC-SHA256 key derived from `ADMIN_PASSWORD`. Returns null when
 * the password is unset/empty (the FAIL-CLOSED root: no key ⇒ nothing verifies).
 */
async function getKey(env: AuthEnv): Promise<CryptoKey | null> {
	const password = env.ADMIN_PASSWORD;
	if (!password) return null;
	try {
		return await crypto.subtle.importKey(
			'raw',
			encoder.encode(password),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);
	} catch {
		return null;
	}
}

/** Compute the hex HMAC-SHA256 of `message` with the password-derived key. */
async function hmacHex(message: string, key: CryptoKey): Promise<string> {
	const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
	return toHex(sig);
}

/**
 * Constant-time string comparison. Compares lengths and every char without
 * early-exit so timing doesn't leak how many leading chars matched.
 */
function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let mismatch = 0;
	for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return mismatch === 0;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Constant-time check of a submitted password against `ADMIN_PASSWORD`.
 * FAILS CLOSED: returns false when `ADMIN_PASSWORD` is unset/empty.
 */
export function checkPassword(input: string, env: AuthEnv): boolean {
	const expected = env.ADMIN_PASSWORD;
	if (!expected) return false;
	if (typeof input !== 'string' || input.length === 0) return false;
	return timingSafeEqual(input, expected);
}

/**
 * Create a signed session token valid for 7 days. Returns null when no key can
 * be derived (no `ADMIN_PASSWORD`) — callers must treat null as "cannot log in".
 */
export async function createSession(env: AuthEnv): Promise<string | null> {
	const key = await getKey(env);
	if (!key) return null;
	const payload = JSON.stringify({ exp: Date.now() + SESSION_MAX_AGE_S * 1000 });
	const encodedPayload = base64urlEncode(payload);
	const sig = await hmacHex(encodedPayload, key);
	return `${encodedPayload}.${sig}`;
}

/**
 * Verify a session token: recompute the HMAC (constant-time), check it matches
 * and that the payload has not expired. Never throws; returns false on any
 * malformed/expired/unsigned input or when no key is available (FAIL CLOSED).
 */
export async function verifySession(
	token: string | undefined | null,
	env: AuthEnv
): Promise<boolean> {
	try {
		if (!token) return false;
		const dot = token.indexOf('.');
		if (dot <= 0) return false;
		const encodedPayload = token.slice(0, dot);
		const providedSig = token.slice(dot + 1);
		if (!encodedPayload || !providedSig) return false;

		const key = await getKey(env);
		if (!key) return false;

		const expectedSig = await hmacHex(encodedPayload, key);
		if (!timingSafeEqual(providedSig, expectedSig)) return false;

		const json = base64urlDecode(encodedPayload);
		if (!json) return false;
		const payload = JSON.parse(json) as { exp?: unknown };
		if (typeof payload.exp !== 'number') return false;
		return Date.now() < payload.exp;
	} catch {
		return false;
	}
}
