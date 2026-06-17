/**
 * Equipos de raid (rosters) de la hermandad.
 *
 * TODO: estos nombres/horarios/progresos son placeholders — confirmar todos
 * los valores con el usuario antes de publicar.
 *
 * Cada equipo lleva su propio avance por raid de la Fase 2:
 *  - ssc → Caverna del Santuario Serpiente (SSC), 6 bosses.
 *  - tk  → Fortaleza de la Tempestad: El Ojo (TK), 4 bosses.
 */

export type RaidProgress = {
	/** Bosses derrotados. */
	kills: number;
	/** Total de bosses de la raid. */
	total: number;
};

export type Team = {
	id: string;
	/** Nombre mostrado, p. ej. "Core 1". */
	name: string;
	schedule: {
		/** Días de raid, p. ej. "Mar · Jue". */
		days: string;
		/** Hora de inicio, p. ej. "21:00". */
		time: string;
		/** Zona horaria, p. ej. "CET". */
		timezone: string;
	};
	/** Avance en Caverna del Santuario Serpiente (6 bosses). */
	ssc: RaidProgress;
	/** Avance en Fortaleza de la Tempestad (4 bosses). */
	tk: RaidProgress;
	/** Si el roster está reclutando actualmente. */
	recruiting: boolean;
	/** Nota corta opcional (p. ej. roles buscados). */
	note?: string;
};

// TODO: confirmar con el usuario (nombres, horarios, progreso, reclutamiento).
export const teams: Team[] = [
	{
		id: 'core-1',
		name: 'Core 1',
		schedule: { days: 'Mar · Jue', time: '21:00', timezone: 'CET' }, // TODO: confirmar con el usuario
		ssc: { kills: 6, total: 6 }, // TODO: confirmar con el usuario
		tk: { kills: 3, total: 4 }, // TODO: confirmar con el usuario
		recruiting: false, // TODO: confirmar con el usuario
		note: 'Roster veterano · cupo completo' // TODO: confirmar con el usuario
	},
	{
		id: 'core-2',
		name: 'Core 2',
		schedule: { days: 'Mié · Vie', time: '21:30', timezone: 'CET' }, // TODO: confirmar con el usuario
		ssc: { kills: 5, total: 6 }, // TODO: confirmar con el usuario
		tk: { kills: 2, total: 4 }, // TODO: confirmar con el usuario
		recruiting: true, // TODO: confirmar con el usuario
		note: 'Buscamos sanadores y DPS a distancia' // TODO: confirmar con el usuario
	},
	{
		id: 'core-3',
		name: 'Core 3',
		schedule: { days: 'Lun · Mié', time: '20:30', timezone: 'CET' }, // TODO: confirmar con el usuario
		ssc: { kills: 4, total: 6 }, // TODO: confirmar con el usuario
		tk: { kills: 2, total: 4 }, // TODO: confirmar con el usuario
		recruiting: true, // TODO: confirmar con el usuario
		note: 'Tanque y DPS cuerpo a cuerpo' // TODO: confirmar con el usuario
	},
	{
		id: 'core-4',
		name: 'Core 4',
		schedule: { days: 'Vie · Dom', time: '22:00', timezone: 'CET' }, // TODO: confirmar con el usuario
		ssc: { kills: 3, total: 6 }, // TODO: confirmar con el usuario
		tk: { kills: 1, total: 4 }, // TODO: confirmar con el usuario
		recruiting: true, // TODO: confirmar con el usuario
		note: 'Roster en formación · todos los roles' // TODO: confirmar con el usuario
	},
	{
		id: 'core-5',
		name: 'Core 5',
		schedule: { days: 'Sáb · Dom', time: '17:00', timezone: 'CET' }, // TODO: confirmar con el usuario
		ssc: { kills: 5, total: 6 }, // TODO: confirmar con el usuario
		tk: { kills: 2, total: 4 }, // TODO: confirmar con el usuario
		recruiting: false, // TODO: confirmar con el usuario
		note: 'Horario diurno de fin de semana' // TODO: confirmar con el usuario
	}
];
