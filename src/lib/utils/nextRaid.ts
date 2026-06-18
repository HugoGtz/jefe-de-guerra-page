/**
 * Cálculo de la PRÓXIMA noche de raid a partir de un horario semanal.
 *
 * Los horarios (`RaidNight`) son "hora de pared" en HORA DE SERVIDOR (ST).
 * El reino Dreamscythe (US) corre en US Central, que alterna entre CST
 * (UTC−6, invierno) y CDT (UTC−5, verano). Para que el countdown sea fiable
 * para CUALQUIER visitante (su PC puede estar en otro huso, p. ej. CET o
 * México), anclamos "ST" a la zona IANA `America/Chicago` y resolvemos el
 * offset real (incl. horario de verano) en cada instante vía `Intl`.
 *
 * La UI nunca muestra "America/Chicago": solo la etiqueta "ST".
 *
 * Enfoque (SSR-safe, sin dependencias ni `window`):
 *  1. Para un día candidato y una hora "HH:MM", averiguamos qué offset aplica
 *     la zona en ese momento con `Intl.DateTimeFormat` + `timeZone`.
 *  2. Construimos el instante UTC que corresponde a esa hora de pared en ST.
 *  3. Recorremos 8 días por delante y nos quedamos con el instante futuro
 *     más cercano respecto a `now`.
 */

import type { RaidNight } from '$lib/data/community';

/** Zona IANA a la que corresponde la "hora de servidor" (ST). Solo interna. */
const SERVER_TZ = 'America/Chicago';

export type NextRaid = {
	/** Instante (UTC) de inicio del próximo raid. */
	date: Date;
	/** Etiqueta legible en español, p. ej. "Core 1 · jueves 19:00". */
	label: string;
};

const WEEKDAY_NAMES = [
	'domingo',
	'lunes',
	'martes',
	'miércoles',
	'jueves',
	'viernes',
	'sábado'
];

/**
 * Offset (en minutos) de la zona `tz` respecto a UTC en el instante `date`.
 * Positivo => la zona va por delante de UTC.
 */
function tzOffsetMinutes(date: Date, tz: string): number {
	const dtf = new Intl.DateTimeFormat('en-US', {
		timeZone: tz,
		hour12: false,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});
	const parts = dtf.formatToParts(date);
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
	let hour = get('hour');
	// Intl puede devolver "24" para medianoche en hour12:false.
	if (hour === 24) hour = 0;
	const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
	return Math.round((asUTC - date.getTime()) / 60000);
}

/** Día de la semana (0=Dom..6=Sáb) de `date` interpretado en la zona `tz`. */
function weekdayInTz(date: Date, tz: string): number {
	const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(date);
	const map: Record<string, number> = {
		Sun: 0,
		Mon: 1,
		Tue: 2,
		Wed: 3,
		Thu: 4,
		Fri: 5,
		Sat: 6
	};
	return map[name] ?? 0;
}

/** Año/mes/día (en la zona `tz`) del instante `date`. */
function ymdInTz(date: Date, tz: string): { year: number; month: number; day: number } {
	const dtf = new Intl.DateTimeFormat('en-CA', {
		timeZone: tz,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
	const parts = dtf.formatToParts(date);
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
	return { year: get('year'), month: get('month'), day: get('day') };
}

/**
 * Instante UTC que corresponde a la hora de pared (y, m, d, hh:mm) en la
 * zona `tz`. Resuelve el offset de forma iterativa (estable salvo en el
 * salto DST, donde la aproximación es aceptable para un countdown).
 */
function wallTimeToUTC(
	year: number,
	month: number,
	day: number,
	hh: number,
	mm: number,
	tz: string
): Date {
	let guess = new Date(Date.UTC(year, month - 1, day, hh, mm, 0));
	for (let i = 0; i < 2; i++) {
		const offset = tzOffsetMinutes(guess, tz);
		const corrected = new Date(Date.UTC(year, month - 1, day, hh, mm, 0) - offset * 60000);
		if (corrected.getTime() === guess.getTime()) break;
		guess = corrected;
	}
	return guess;
}

/**
 * Devuelve la próxima noche de raid futura respecto a `now`, o null si no
 * hay horarios. Robusto en los límites de semana (mira 8 días por delante)
 * y fiable en cualquier huso del visitante (las horas se anclan a ST).
 *
 * @param nights horarios semanales recurrentes (hora de servidor)
 * @param now    instante de referencia (por defecto, ahora)
 */
export function getNextRaid(nights: RaidNight[], now: Date = new Date()): NextRaid | null {
	if (!nights || nights.length === 0) return null;

	let best: { date: Date; night: RaidNight } | null = null;

	// Recorremos hoy + 7 días siguientes (cubre cualquier semana completa).
	for (let offset = 0; offset <= 7; offset++) {
		const dayInstant = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
		const wd = weekdayInTz(dayInstant, SERVER_TZ);
		const { year, month, day } = ymdInTz(dayInstant, SERVER_TZ);

		for (const night of nights) {
			if (night.weekday !== wd) continue;
			const [hh, mm] = night.time.split(':').map(Number);
			if (Number.isNaN(hh) || Number.isNaN(mm)) continue;

			const start = wallTimeToUTC(year, month, day, hh, mm, SERVER_TZ);
			if (start.getTime() <= now.getTime()) continue;
			if (!best || start.getTime() < best.date.getTime()) {
				best = { date: start, night };
			}
		}
	}

	if (!best) return null;

	const dayName = WEEKDAY_NAMES[best.night.weekday] ?? '';
	const teamPart = best.night.team ? `${best.night.team} · ` : '';
	const label = `${teamPart}${dayName} ${best.night.time}`.trim();

	return { date: best.date, label };
}
