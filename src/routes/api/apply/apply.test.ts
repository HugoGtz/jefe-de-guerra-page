import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from './+server';

const WEBHOOK = 'https://discord.example/webhook';

/** Build the minimal RequestHandler event the POST handler reads. */
function event(body: unknown, opts?: { webhook?: string | null; raw?: string }) {
	const request = new Request('http://localhost/api/apply', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: opts?.raw ?? JSON.stringify(body)
	});
	const env = opts?.webhook === undefined ? { DISCORD_WEBHOOK_URL: WEBHOOK } : {};
	if (opts?.webhook) (env as Record<string, string>).DISCORD_WEBHOOK_URL = opts.webhook;
	// No DB / no cf-connecting-ip → the rate limiter is skipped (fail-open).
	return { request, platform: { env } } as unknown as Parameters<typeof POST>[0];
}

const valid = {
	character: 'Thrall',
	wowClass: 'Shaman',
	spec: 'Elemental',
	ilvl: '120',
	logs: 'https://warcraftlogs.com/character/x',
	experience: 'Cleared SSC',
	availability: 'Mon/Wed',
	message: 'hi'
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
	fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('POST /api/apply', () => {
	it('rejects an unparseable body with 400', async () => {
		const res = await POST(event(null, { raw: 'not json' }));
		expect(res.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('silently accepts (200) and drops honeypot submissions', async () => {
		const res = await POST(event({ ...valid, website: 'i-am-a-bot' }));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
		expect(fetchMock).not.toHaveBeenCalled(); // never forwarded to Discord
	});

	it('requires character + class', async () => {
		const res = await POST(event({ ...valid, character: '', wowClass: '' }));
		expect(res.status).toBe(400);
	});

	it('rejects a non-http logs link', async () => {
		const res = await POST(event({ ...valid, logs: 'javascript:alert(1)' }));
		expect(res.status).toBe(400);
	});

	it('500s when the webhook secret is not configured', async () => {
		const res = await POST(event(valid, { webhook: null }));
		expect(res.status).toBe(500);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('forwards a valid application to the Discord webhook', async () => {
		const res = await POST(event(valid));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(fetchMock.mock.calls[0][0]).toBe(WEBHOOK);
	});

	it('502s when Discord rejects the webhook post', async () => {
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 400 }));
		const res = await POST(event(valid));
		expect(res.status).toBe(502);
	});
});
