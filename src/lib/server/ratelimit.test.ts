import { describe, it, expect, vi } from 'vitest';
import { rateLimit } from './ratelimit';

function store(initial: { json: string; fetchedAt: number } | null) {
	let row = initial;
	return {
		read: vi.fn(async () => row),
		write: vi.fn(async (json: string, fetchedAt: number) => {
			row = { json, fetchedAt };
		}),
		get row() {
			return row;
		}
	};
}

const WINDOW = 60_000;

describe('rateLimit', () => {
	it('allows and starts a window on the first request', async () => {
		const s = store(null);
		const r = await rateLimit({ now: 1000, limit: 3, windowMs: WINDOW, ...s });
		expect(r.allowed).toBe(true);
		expect(s.write).toHaveBeenCalledWith(JSON.stringify({ count: 1 }), 1000);
	});

	it('increments within the window up to the limit', async () => {
		const s = store({ json: JSON.stringify({ count: 2 }), fetchedAt: 1000 });
		const r = await rateLimit({ now: 1500, limit: 3, windowMs: WINDOW, ...s });
		expect(r.allowed).toBe(true);
		expect(s.write).toHaveBeenCalledWith(JSON.stringify({ count: 3 }), 1000); // keeps window start
	});

	it('denies once the limit is exceeded and reports retryAfter', async () => {
		const s = store({ json: JSON.stringify({ count: 3 }), fetchedAt: 1000 });
		const r = await rateLimit({ now: 1200, limit: 3, windowMs: WINDOW, ...s });
		expect(r.allowed).toBe(false);
		expect(r.retryAfterMs).toBe(WINDOW - 200);
		expect(s.write).not.toHaveBeenCalled(); // no write when denied
	});

	it('resets to a new window once the old one has expired', async () => {
		const s = store({ json: JSON.stringify({ count: 99 }), fetchedAt: 1000 });
		const r = await rateLimit({ now: 1000 + WINDOW + 1, limit: 3, windowMs: WINDOW, ...s });
		expect(r.allowed).toBe(true);
		expect(s.write).toHaveBeenCalledWith(JSON.stringify({ count: 1 }), 1000 + WINDOW + 1);
	});

	it('fails open on a corrupt row (treats count as 0)', async () => {
		const s = store({ json: 'garbage', fetchedAt: 1000 });
		const r = await rateLimit({ now: 1100, limit: 3, windowMs: WINDOW, ...s });
		expect(r.allowed).toBe(true);
		expect(s.write).toHaveBeenCalledWith(JSON.stringify({ count: 1 }), 1000);
	});
});
