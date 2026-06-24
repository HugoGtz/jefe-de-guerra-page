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
	/**
	 * Porcentaje (0–100) ya calculado en el servidor para que el cliente no lo
	 * derive. Se rellena en la capa de datos antes de enviar al cliente; los datos
	 * estáticos pueden omitirlo (se normaliza al cargar).
	 */
	percent?: number;
};

export type Team = {
	id: string;
	/** Nombre mostrado, p. ej. "Core 1". */
	name: string;
	schedule: {
		/** Días de raid, p. ej. "Mar · Jue". */
		days: string;
		/** Hora de inicio en hora de servidor, p. ej. "21:00". */
		time: string;
		/** Referencia horaria; siempre hora de servidor, p. ej. "ST". */
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
	/** ID de hermandad en WarcraftLogs (Fresh/Anniversary) para enlazar a sus logs. */
	wclGuildId?: number;
	/**
	 * ID del "raid team" (tag) de este core dentro de la guild padre 792187.
	 * Los logs están fragmentados: algunos cores suben a su `wclGuildId` propio,
	 * otros (p. ej. Core 4) suben a la guild padre con este tag. La capa WCL usa
	 * este id para atribuir al core correcto los reports que viven en el padre.
	 */
	wclTagId?: number;
};

/**
 * URL de los logs de la hermandad padre "Jefe de Guerra" en WarcraftLogs
 * (Fresh/Anniversary Classic).
 */
export const guildLogsUrl = 'https://es.fresh.warcraftlogs.com/guild/id/792187';

/** Construye la URL de los logs de una hermandad WCL a partir de su ID. */
export const wclGuildUrl = (id: number) =>
	'https://es.fresh.warcraftlogs.com/guild/id/' + id;

/** Construye la URL del calendario WCL de una hermandad a partir de su ID. */
export const wclCalendarUrl = (id: number) =>
	'https://es.fresh.warcraftlogs.com/guild/calendar/' + id;

/** URL del perfil de un personaje en WarcraftLogs (US · Dreamscythe). */
export const wclCharacterUrl = (name: string) =>
	'https://es.fresh.warcraftlogs.com/character/us/dreamscythe/' + encodeURIComponent(name);

// TODO: confirmar con el usuario (nombres, horarios, progreso, reclutamiento).
export const teams: Team[] = [
	{
		id: 'core-1',
		name: 'Core 1',
		schedule: { days: 'Lun · Jue · Dom', time: '19:00 – 22:00', timezone: 'ST' },
		ssc: { kills: 6, total: 6 }, // TODO: confirmar con el usuario
		tk: { kills: 3, total: 4 }, // TODO: confirmar con el usuario
		recruiting: false, // TODO: confirmar con el usuario
		note: 'Roster veterano · cupo completo', // TODO: confirmar con el usuario
		wclGuildId: 826903,
		wclTagId: 76393
	},
	{
		id: 'core-2',
		name: 'Core 2',
		schedule: { days: 'Mar · Mié · Jue', time: '19:00 – 22:00', timezone: 'ST' },
		ssc: { kills: 5, total: 6 }, // TODO: confirmar con el usuario
		tk: { kills: 2, total: 4 }, // TODO: confirmar con el usuario
		recruiting: true, // TODO: confirmar con el usuario
		note: 'Buscamos sanadores y DPS a distancia', // TODO: confirmar con el usuario
		wclGuildId: 826904,
		wclTagId: 76394
	},
	{
		id: 'core-3',
		name: 'Core 3',
		schedule: { days: 'Sáb · Dom', time: '20:00 – 23:00', timezone: 'ST' },
		ssc: { kills: 4, total: 6 }, // TODO: confirmar con el usuario
		tk: { kills: 2, total: 4 }, // TODO: confirmar con el usuario
		recruiting: true, // TODO: confirmar con el usuario
		note: 'Tanque y DPS cuerpo a cuerpo', // TODO: confirmar con el usuario
		wclGuildId: 826905,
		wclTagId: 76395
	},
	{
		id: 'core-4',
		name: 'Core 4',
		schedule: { days: 'Jue · Vie · Sáb', time: '07:30 – 10:30', timezone: 'ST' },
		ssc: { kills: 3, total: 6 }, // TODO: confirmar con el usuario
		tk: { kills: 1, total: 4 }, // TODO: confirmar con el usuario
		recruiting: true, // TODO: confirmar con el usuario
		note: 'Roster en formación · todos los roles', // TODO: confirmar con el usuario
		wclGuildId: 826907,
		wclTagId: 76396
	},
	{
		id: 'core-5',
		name: 'Core 5',
		schedule: { days: 'Lun · Dom', time: '18:00 – 22:00', timezone: 'ST' },
		ssc: { kills: 5, total: 6 }, // TODO: confirmar con el usuario
		tk: { kills: 2, total: 4 }, // TODO: confirmar con el usuario
		recruiting: false, // TODO: confirmar con el usuario
		note: 'Roster consolidado', // TODO: confirmar con el usuario
		wclGuildId: 826908,
		wclTagId: 76397
	},
	{
		id: 'core-6',
		name: 'Core 6',
		schedule: { days: 'Jue · Dom', time: '17:30 – 20:30', timezone: 'ST' },
		ssc: { kills: 2, total: 6 }, // TODO: confirmar
		tk: { kills: 0, total: 4 }, // TODO: confirmar
		recruiting: true, // TODO: confirmar
		note: 'Roster joven · buscamos todos los roles', // TODO: confirmar
		wclGuildId: 826909,
		wclTagId: 76398
	},
	{
		id: 'core-7',
		name: 'Core 7',
		schedule: { days: 'Por confirmar', time: '', timezone: 'ST' },
		ssc: { kills: 1, total: 6 }, // TODO: confirmar
		tk: { kills: 0, total: 4 }, // TODO: confirmar
		recruiting: true, // TODO: confirmar
		note: 'Nuevo core en formación', // TODO: confirmar
		wclGuildId: 826910,
		wclTagId: 76399
	}
];
