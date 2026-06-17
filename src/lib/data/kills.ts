/**
 * Últimas hazañas de la hermandad (kills recientes) para la línea de tiempo.
 *
 * El orden de `feats` es de más reciente a más antiguo (newest first).
 */

export type Feat = {
	/** Nombre del boss derrotado. */
	boss: string;
	/** Raid a la que pertenece el boss. */
	raid: 'SSC' | 'TK' | 'Karazhan' | 'Gruul' | 'Magtheridon';
	/** Fecha de la kill en ISO 'yyyy-mm-dd'. */
	date: string;
	/** Equipo que consiguió la kill (opcional). */
	team?: string;
	/** Si fue una primera matanza de la hermandad. */
	firstKill?: boolean;
};

// TODO: confirmar
export const feats: Feat[] = [
	{ boss: 'Lady Vashj', raid: 'SSC', date: '2026-06-12', team: 'Core 1', firstKill: true },
	{ boss: 'Kael’thas Sol Furioso', raid: 'TK', date: '2026-06-05', team: 'Core 1' },
	{ boss: 'El Maestro de Mareas Karathress', raid: 'SSC', date: '2026-05-29', team: 'Core 2' },
	{ boss: 'Al’ar', raid: 'TK', date: '2026-05-22', team: 'Core 1', firstKill: true },
	{ boss: 'Leotheras el Ciego', raid: 'SSC', date: '2026-05-15', team: 'Core 2' },
	{ boss: 'Príncipe Malchezaar', raid: 'Karazhan', date: '2026-05-08', team: 'Core 3' },
	{ boss: 'Magtheridon', raid: 'Magtheridon', date: '2026-05-01', firstKill: true },
	{ boss: 'Gran Señor Gruul', raid: 'Gruul', date: '2026-04-24', team: 'Core 1' }
];
