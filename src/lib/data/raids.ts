/**
 * Raid progression data — authentic TBC Classic structure.
 * Kill counts marked TODO are realistic in-progress placeholders that the
 * user must confirm against the guild's real progress.
 */

export type Boss = {
	name: string;
	defeated: boolean;
};

export type Raid = {
	id: string;
	name: string;
	/** Abreviatura conocida, p. ej. "SSC", "TK". */
	abbr?: string;
	bosses: Boss[];
	/** Bosses derrotados / total (derivado de `bosses`, precalculado para UI). */
	kills: number;
	total: number;
	/** Porcentaje 0–100 (redondeado). */
	percent: number;
};

export type PhaseStatus = 'completed' | 'in-progress' | 'upcoming';

export type Phase = {
	id: string;
	name: string;
	/** Título mostrado, p. ej. "Fase 1". */
	label: string;
	status: PhaseStatus;
	/** Etiqueta de estado en español para la UI. */
	statusLabel: string;
	/** Porcentaje global de la fase (0–100). */
	percent: number;
	raids: Raid[];
};

/** Construye un Raid calculando kills/total/percent a partir de sus bosses. */
function buildRaid(
	id: string,
	name: string,
	bosses: Boss[],
	abbr?: string
): Raid {
	const total = bosses.length;
	const kills = bosses.filter((b) => b.defeated).length;
	const percent = total === 0 ? 0 : Math.round((kills / total) * 100);
	return { id, name, abbr, bosses, kills, total, percent };
}

// ── Fase 1 — COMPLETADA 100% ──────────────────────────────────────────────
const karazhan = buildRaid('karazhan', 'Karazhan', [
	{ name: 'Attumen the Huntsman', defeated: true },
	{ name: 'Moroes', defeated: true },
	{ name: 'Maiden of Virtue', defeated: true },
	{ name: 'Opera Event', defeated: true },
	{ name: 'The Curator', defeated: true },
	{ name: 'Terestian Illhoof', defeated: true },
	{ name: 'Shade of Aran', defeated: true },
	{ name: 'Netherspite', defeated: true },
	{ name: 'Chess Event', defeated: true },
	{ name: "Prince Malchezaar", defeated: true }
]);

const gruul = buildRaid(
	'gruuls-lair',
	"Gruul's Lair",
	[
		{ name: 'High King Maulgar', defeated: true },
		{ name: 'Gruul the Dragonkiller', defeated: true }
	],
	'Gruul'
);

const magtheridon = buildRaid(
	'magtheridons-lair',
	"Magtheridon's Lair",
	[{ name: 'Magtheridon', defeated: true }],
	'Magtheridon'
);

// ── Fase 2 — EN PROGRESO ──────────────────────────────────────────────────
// TODO: confirmar avance real con el usuario (qué bosses están caídos)
const ssc = buildRaid(
	'serpentshrine-cavern',
	'Caverna del Santuario Serpiente',
	[
		{ name: 'Hydross the Unstable', defeated: true },
		{ name: 'The Lurker Below', defeated: true },
		{ name: 'Leotheras the Blind', defeated: true },
		{ name: 'Fathom-Lord Karathress', defeated: true },
		{ name: 'Morogrim Tidewalker', defeated: false }, // TODO: confirmar
		{ name: 'Lady Vashj', defeated: false } // TODO: confirmar
	],
	'SSC'
);

// TODO: confirmar avance real con el usuario (qué bosses están caídos)
const tk = buildRaid(
	'tempest-keep',
	'Fortaleza de la Tempestad: El Ojo',
	[
		{ name: "Al'ar", defeated: true },
		{ name: 'Void Reaver', defeated: true },
		{ name: 'High Astromancer Solarian', defeated: false }, // TODO: confirmar
		{ name: "Kael'thas Sunstrider", defeated: false } // TODO: confirmar
	],
	'TK'
);

/** Porcentaje global de una fase a partir de sus raids (media ponderada por bosses). */
function phasePercent(raids: Raid[]): number {
	const total = raids.reduce((acc, r) => acc + r.total, 0);
	const kills = raids.reduce((acc, r) => acc + r.kills, 0);
	return total === 0 ? 0 : Math.round((kills / total) * 100);
}

export const phases: Phase[] = [
	{
		id: 'phase-1',
		name: 'Fase 1',
		label: 'Fase 1',
		status: 'completed',
		statusLabel: 'Completada 100%',
		percent: 100,
		raids: [karazhan, gruul, magtheridon]
	},
	{
		id: 'phase-2',
		name: 'Fase 2',
		label: 'Fase 2',
		status: 'in-progress',
		statusLabel: 'En progreso',
		percent: phasePercent([ssc, tk]),
		raids: [ssc, tk]
	}
];

export const phaseOne = phases[0];
export const phaseTwo = phases[1];
