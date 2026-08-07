import { describe, it, expect, vi } from 'vitest';
import { cacheThrough, type CacheRow } from './cache';

/** Build a read/write pair backed by an in-memory row. */
function fakeStore(initial: CacheRow | null) {
	let row = initial;
	return {
		read: vi.fn(async () => row),
		write: vi.fn(async (json: string) => {
			row = { json, fetchedAt: 0 };
		}),
		get row() {
			return row;
		}
	};
}

describe('cacheThrough', () => {
	it('returns the cached value when the row is fresh (no fetch)', async () => {
		const store = fakeStore({ json: JSON.stringify({ v: 1 }), fetchedAt: 100 });
		const fetch = vi.fn(async () => ({ v: 999 }));

		const out = await cacheThrough({ now: 150, ttlMs: 100, ...store, fetch });

		expect(out).toEqual({ v: 1 });
		expect(fetch).not.toHaveBeenCalled();
	});

	it('fetches and writes when the row is stale', async () => {
		const store = fakeStore({ json: JSON.stringify({ v: 1 }), fetchedAt: 0 });
		const fetch = vi.fn(async () => ({ v: 2 }));

		const out = await cacheThrough({ now: 1000, ttlMs: 100, ...store, fetch });

		expect(out).toEqual({ v: 2 });
		expect(store.write).toHaveBeenCalledWith(JSON.stringify({ v: 2 }));
	});

	it('fetches when there is no cache row', async () => {
		const store = fakeStore(null);
		const fetch = vi.fn(async () => ({ v: 3 }));

		const out = await cacheThrough({ now: 0, ttlMs: 100, ...store, fetch });

		expect(out).toEqual({ v: 3 });
		expect(store.write).toHaveBeenCalledOnce();
	});

	it('falls back to the stale row when the fetch returns null', async () => {
		const store = fakeStore({ json: JSON.stringify({ v: 'stale' }), fetchedAt: 0 });
		const fetch = vi.fn(async () => null);

		const out = await cacheThrough({ now: 10_000, ttlMs: 100, ...store, fetch });

		expect(out).toEqual({ v: 'stale' });
		expect(store.write).not.toHaveBeenCalled();
	});

	it('falls back to the stale row when the fetch throws', async () => {
		const store = fakeStore({ json: JSON.stringify({ v: 'stale' }), fetchedAt: 0 });
		const fetch = vi.fn(async () => {
			throw new Error('network');
		});

		const out = await cacheThrough({ now: 10_000, ttlMs: 100, ...store, fetch });

		expect(out).toEqual({ v: 'stale' });
	});

	it('returns null when there is no cache and the fetch fails', async () => {
		const store = fakeStore(null);
		const fetch = vi.fn(async () => null);

		const out = await cacheThrough({ now: 0, ttlMs: 100, ...store, fetch });

		expect(out).toBeNull();
	});

	it('treats a fresh but corrupt row as a miss and re-fetches', async () => {
		const store = fakeStore({ json: '{not json', fetchedAt: 100 });
		const fetch = vi.fn(async () => ({ v: 'fresh' }));

		const out = await cacheThrough({ now: 120, ttlMs: 100, ...store, fetch });

		expect(out).toEqual({ v: 'fresh' });
		expect(fetch).toHaveBeenCalledOnce();
	});

	it('honors custom parse/serialize (e.g. Set round-trip) and does not fail the read on write error', async () => {
		const store = fakeStore(null);
		const failingWrite = vi.fn(async () => {
			throw new Error('d1 down');
		});
		const out = await cacheThrough<{ names: Set<string> }>({
			now: 0,
			ttlMs: 100,
			read: store.read,
			write: failingWrite,
			fetch: async () => ({ names: new Set(['a', 'b']) }),
			serialize: (v) => JSON.stringify({ names: [...v.names] })
		});

		expect(out).toEqual({ names: new Set(['a', 'b']) });
		expect(failingWrite).toHaveBeenCalledOnce(); // attempted, but its throw was swallowed
	});
});
