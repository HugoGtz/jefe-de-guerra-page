/**
 * Core guild identity, copy and raid schedule.
 * User-facing strings are in Spanish; identifiers stay in English.
 */

export type RaidSchedule = {
	/** Días de raid, p. ej. "Martes y Jueves". */
	days: string;
	/** Horario, p. ej. "21:00 – 00:00". */
	time: string;
	/** Zona horaria de referencia, p. ej. "CET (hora de España)". */
	timezone: string;
	/** Nota corta opcional sobre puntualidad / invocaciones. */
	note?: string;
};

export type Guild = {
	name: string;
	/** Lema corto y épico mostrado bajo el logo. */
	motto: string;
	/** Texto del badge de identidad (facción · servidor · juego). */
	badge: string;
	faction: string;
	server: string;
	game: string;
	/** Párrafos de "quiénes somos". */
	aboutWhoWeAre: string[];
	/** Párrafos sobre el ambiente de la guild. */
	aboutVibe: string[];
	schedule: RaidSchedule;
};

export const guild: Guild = {
	name: 'Jefe de Guerra',
	motto: 'El orgullo de la Horda en Dreamscythe',
	badge: 'Horda · Dreamscythe · TBC Classic',
	faction: 'Horda',
	server: 'Dreamscythe',
	game: 'The Burning Crusade Classic',

	aboutWhoWeAre: [
		'Somos <strong>Jefe de Guerra</strong>, una hermandad de la Horda forjada en el servidor Dreamscythe para conquistar el contenido de The Burning Crusade Classic. Reunimos a jugadores hispanohablantes que comparten una misma meta: progresar con constancia, sin dejar atrás el buen rollo.',
		'Tras completar al 100% la Fase 1, marchamos firmes hacia las profundidades de la Caverna del Santuario Serpiente y la Fortaleza de la Tempestad. Cada lockout es un paso más hacia la cima.'
	],

	aboutVibe: [
		'Aquí se viene a disfrutar. Combinamos raids exigentes con un ambiente cercano: nada de gritos ni dramas, solo gente que quiere mejorar y pasarlo bien entre amigos.',
		'Valoramos la asistencia, la actitud y las ganas de aprender por encima del gearscore. Si traes mecánicas aprendidas y respeto por el grupo, encajarás de sobra.'
	],

	schedule: {
		// TODO: confirmar con el usuario
		days: 'Martes y Jueves',
		// TODO: confirmar con el usuario
		time: '21:00 – 00:00',
		// TODO: confirmar con el usuario
		timezone: 'CET · hora de España (Madrid)',
		// TODO: confirmar con el usuario
		note: 'Se espera puntualidad: invocaciones 15 minutos antes del inicio.'
	}
};
