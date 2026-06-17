/**
 * Cloudflare Pages Function — POST /api/apply
 *
 * Recibe la aplicación del formulario (#aplica) y la reenvía a Discord usando
 * un webhook que vive SOLO en el servidor. El cliente nunca ve el webhook.
 *
 * CONFIGURACIÓN (en el panel de Cloudflare Pages):
 *   Settings > Environment variables > add:
 *     DISCORD_WEBHOOK_URL = https://discord.com/api/webhooks/XXXX/YYYY
 *   (marcar como "secret"/encrypted). Redeploy tras añadirla.
 *
 * PRUEBA LOCAL (no corre en `vite dev`; usa Wrangler sobre el build):
 *   npm run build
 *   npx wrangler pages dev build --binding DISCORD_WEBHOOK_URL=<tu-webhook>
 *
 * Anti-spam: honeypot ("website") + validación + límites de tamaño. Para mayor
 * dureza, añade Cloudflare Turnstile o una regla de rate-limit en el panel.
 */

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const clamp = (v, n) => String(v ?? '').trim().slice(0, n);

export async function onRequestPost({ request, env }) {
	let data;
	try {
		data = await request.json();
	} catch {
		return json({ ok: false, error: 'Solicitud inválida.' }, 400);
	}

	// Honeypot: un bot suele rellenar campos ocultos. Lo descartamos en silencio.
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
		return json({ ok: false, error: 'Faltan campos obligatorios.' }, 400);
	}
	if (logs && !/^https?:\/\//i.test(logs)) {
		return json({ ok: false, error: 'El enlace de logs no es válido.' }, 400);
	}

	const webhook = env.DISCORD_WEBHOOK_URL;
	if (!webhook) {
		return json({ ok: false, error: 'El servidor no tiene configurado el webhook.' }, 500);
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
				],
				timestamp: new Date().toISOString()
			}
		]
	};

	let res;
	try {
		res = await fetch(webhook, {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify(payload)
		});
	} catch {
		return json({ ok: false, error: 'No se pudo contactar a Discord.' }, 502);
	}
	if (!res.ok) {
		return json({ ok: false, error: 'Discord rechazó el envío.' }, 502);
	}

	return json({ ok: true });
}

function json(body, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}
