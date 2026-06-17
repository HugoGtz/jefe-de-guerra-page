import { json, type RequestHandler } from '@sveltejs/kit';

/**
 * POST /api/apply — recruitment application.
 * Forwards the form to Discord using a server-side webhook secret
 * (platform.env.DISCORD_WEBHOOK_URL). The webhook is never exposed to the client.
 *
 * Set the secret on the Pages project:
 *   wrangler pages secret put DISCORD_WEBHOOK_URL --project-name jefe-de-guerra
 * Anti-spam: honeypot ("website") + validation + size caps.
 */

const clamp = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);

export const POST: RequestHandler = async ({ request, platform }) => {
	let data: Record<string, unknown>;
	try {
		data = await request.json();
	} catch {
		return json({ ok: false, error: 'Solicitud inválida.' }, { status: 400 });
	}

	// Honeypot: si un bot rellena el campo oculto, descartamos en silencio.
	if (clamp(data.website, 1)) {
		return json({ ok: true });
	}

	const character = clamp(data.character, 80);
	const wowClass = clamp(data.wowClass, 40);
	const spec = clamp(data.spec, 80);
	const ilvl = clamp(data.ilvl, 10);
	const logs = clamp(data.logs, 300);
	const experience = clamp(data.experience, 1024);
	const availability = clamp(data.availability, 300);
	const message = clamp(data.message, 1024);

	if (!character || !wowClass) {
		return json({ ok: false, error: 'Faltan campos obligatorios.' }, { status: 400 });
	}
	if (logs && !/^https?:\/\//i.test(logs)) {
		return json({ ok: false, error: 'El enlace de logs no es válido.' }, { status: 400 });
	}

	const webhook = platform?.env?.DISCORD_WEBHOOK_URL;
	if (!webhook) {
		return json({ ok: false, error: 'El servidor no tiene configurado el webhook.' }, { status: 500 });
	}

	const payload = {
		username: 'Reclutamiento · Jefe de Guerra',
		embeds: [
			{
				title: `Nueva aplicación: ${character}`,
				color: 0xa10613,
				fields: [
					{ name: 'Clase', value: wowClass || '—', inline: true },
					{ name: 'Spec / rol', value: spec || '—', inline: true },
					{ name: 'iLvl', value: ilvl || '—', inline: true },
					{ name: 'WarcraftLogs', value: logs || 'No indicado' },
					{ name: 'Disponibilidad', value: availability || '—' },
					{ name: 'Experiencia', value: experience || '—' },
					{ name: 'Mensaje', value: message || '—' }
				]
			}
		]
	};

	let res: Response;
	try {
		res = await fetch(webhook, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		});
	} catch {
		return json({ ok: false, error: 'No se pudo contactar a Discord.' }, { status: 502 });
	}
	if (!res.ok) {
		return json({ ok: false, error: 'Discord rechazó el envío.' }, { status: 502 });
	}

	return json({ ok: true });
};
