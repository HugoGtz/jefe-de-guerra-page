/**
 * Password hashing for admin users — PBKDF2-HMAC-SHA256 over WebCrypto.
 *
 * Available on both Cloudflare Workers and Node 22 (no Node `crypto` import).
 * Stored format is self-describing so iteration counts can evolve without a
 * migration: `pbkdf2$<iters>$<saltB64>$<hashB64>`.
 *
 * `verifyPassword` NEVER throws — any malformed/garbage stored value yields
 * `false`, and the final comparison is constant-time so it doesn't leak how many
 * leading bytes matched. ~100k iterations keeps per-login CPU reasonable for the
 * edge; logins are infrequent.
 *
 * The derived key is NEVER sent to the client; only the opaque stored string is
 * persisted in the `users` table.
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const PREFIX = 'pbkdf2';

const encoder = new TextEncoder();

// ── base64 (standard, with padding) helpers ──────────────────────────────────

/** Standard base64-encode a byte buffer. */
function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary);
}

/** Standard base64-decode to bytes. Throws on malformed input (callers guard). */
function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

// ── Core derivation ──────────────────────────────────────────────────────────

/** Derive `HASH_BYTES` bytes from `plain` with the given salt + iterations. */
async function derive(
	plain: string,
	salt: Uint8Array<ArrayBuffer>,
	iterations: number
): Promise<Uint8Array> {
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(plain),
		'PBKDF2',
		false,
		['deriveBits']
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
		keyMaterial,
		HASH_BYTES * 8
	);
	return new Uint8Array(bits);
}

/** Constant-time byte comparison (length-checked, no early exit). */
function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let mismatch = 0;
	for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
	return mismatch === 0;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Hash a plaintext password into a self-describing PBKDF2 string suitable for
 * storage: `pbkdf2$<iters>$<saltB64>$<hashB64>`. A fresh random salt is used.
 */
export async function hashPassword(plain: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
	const hash = await derive(plain, salt, PBKDF2_ITERATIONS);
	return `${PREFIX}$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
}

/**
 * Verify `plain` against a previously stored hash string. Re-derives with the
 * stored salt + iterations and compares in constant time. Returns `false` on any
 * malformed/unknown stored value or empty input — NEVER throws.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
	try {
		if (typeof plain !== 'string' || plain.length === 0) return false;
		if (typeof stored !== 'string') return false;

		const parts = stored.split('$');
		if (parts.length !== 4) return false;
		const [prefix, itersStr, saltB64, hashB64] = parts;
		if (prefix !== PREFIX) return false;

		const iterations = Number.parseInt(itersStr, 10);
		if (!Number.isInteger(iterations) || iterations <= 0) return false;

		const salt = base64ToBytes(saltB64);
		const expected = base64ToBytes(hashB64);
		if (salt.length === 0 || expected.length === 0) return false;

		const actual = await derive(plain, salt, iterations);
		return timingSafeEqualBytes(actual, expected);
	} catch {
		return false;
	}
}
