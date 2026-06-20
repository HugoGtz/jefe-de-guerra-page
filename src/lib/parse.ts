/**
 * WarcraftLogs parse-tier helpers (shared by Officers + Salón de la Fama).
 *
 * Colors follow WCL's standard parse tiers:
 *   <25 grey · 25–49 green · 50–74 blue · 75–94 purple · 95–98 orange/pink · 99+ gold
 */

export type ParseTier = {
	/** Hex color for the badge border / background tint / glow accent. */
	color: string;
	/** Spanish tier name (e.g. "Insano", "Épico") for accessible labels. */
	label: string;
};

/** Map a 0–100 parse score to its WCL tier color + a short tier label. */
export function parseTier(score: number): ParseTier {
	if (score >= 99) return { color: '#e5cc80', label: 'Legendario' }; // gold
	if (score >= 95) return { color: '#e268a8', label: 'Insano' }; // pink
	if (score >= 75) return { color: '#a335ee', label: 'Épico' }; // purple
	if (score >= 50) return { color: '#0070ff', label: 'Raro' }; // blue
	if (score >= 25) return { color: '#1eff00', label: 'Común' }; // green
	return { color: '#9d9d9d', label: 'Pobre' }; // grey
}

/** Just the color (most callers only need this). */
export function parseColor(score: number): string {
	return parseTier(score).color;
}

/** Spanish label for a combat role. */
export function roleLabelEs(role: 'DPS' | 'Healer' | 'Tank'): string {
	if (role === 'Healer') return 'Sanador';
	if (role === 'Tank') return 'Tanque';
	return 'DPS';
}

/**
 * Format a kill duration (milliseconds) as "m:ss" (e.g. 271299 → "4:31").
 * Returns null for missing/zero durations so the UI can omit it. Lives here
 * (not in the server-only WCL layer) so it is safe to import from components.
 */
export function formatDuration(ms: number | null | undefined): string | null {
	if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return null;
	const totalSeconds = Math.round(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
