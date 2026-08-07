/**
 * Display formatters for the internal player page (`/jugador/[name]`). Pure and
 * framework-free so they can be unit-tested and shared by the player
 * sub-components.
 */

/** Format a leaderboard rank as "#1.234" (es-ES grouping), or "—" when unranked. */
export function rankText(value: number | null): string {
	return value != null ? '#' + value.toLocaleString('es-ES') : '—';
}

/** Compact DPS/HPS amount: ≥1000 → "12.3 k" (trailing ".0" dropped), else the raw number. "—" when null. */
export function amountText(amount: number | null): string {
	if (amount == null) return '—';
	if (amount >= 1000) return (amount / 1000).toFixed(1).replace('.0', '') + ' k';
	return String(amount);
}

const MESES_ES = [
	'ene',
	'feb',
	'mar',
	'abr',
	'may',
	'jun',
	'jul',
	'ago',
	'sep',
	'oct',
	'nov',
	'dic'
];

/** ISO `yyyy-mm-dd` → "d mmm yyyy" in Spanish (e.g. "5 jun 2026"). Passthrough on malformed input. */
export function dateText(iso: string): string {
	const parts = iso.split('-');
	if (parts.length !== 3) return iso;
	const [y, m, d] = parts;
	const mi = Number(m) - 1;
	const mes = mi >= 0 && mi < 12 ? MESES_ES[mi] : m;
	return `${Number(d)} ${mes} ${y}`;
}
