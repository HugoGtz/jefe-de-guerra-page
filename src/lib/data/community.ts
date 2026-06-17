/**
 * Datos de "Comunidad viva": Discord y horarios de raid.
 *
 * Todos los horarios se interpretan en `raidTimezone` (Europe/Madrid), que
 * cubre tanto CET (invierno) como CEST (verano) automáticamente vía Intl.
 */

import { recruitment } from '$lib/data/recruitment';

/**
 * ID numérico del servidor de Discord, usado por el widget embebido.
 * Vacío => el componente Community muestra una tarjeta de respaldo en su lugar.
 */
// TODO: poner el ID del servidor de Discord y ACTIVAR el widget en
// Ajustes del servidor > Widget (Activar widget del servidor).
export const discordServerId: string = '';

/** Invite de Discord — referencia el dato canónico de reclutamiento. */
export const discordInvite: string = recruitment.discordUrl;

/** Zona horaria de referencia para TODOS los horarios de raid. */
export const raidTimezone = 'Europe/Madrid';

export type RaidNight = {
	/** Equipo asociado opcional (p. ej. "Core 1"). */
	team?: string;
	/** Día de la semana: 0 = Dom, 1 = Lun, … 6 = Sáb. */
	weekday: number;
	/** Hora de inicio en formato 'HH:MM', interpretada en `raidTimezone`. */
	time: string;
};

/**
 * Noches de raid recurrentes durante la semana. El countdown calcula la
 * próxima ocurrencia a partir de esta lista.
 */
// TODO: confirmar horarios reales
export const raidNights: RaidNight[] = [
	{ team: 'Core 1', weekday: 2, time: '21:00' }, // Martes
	{ team: 'Core 1', weekday: 4, time: '21:00' }, // Jueves
	{ team: 'Core 2', weekday: 3, time: '21:30' }, // Miércoles
	{ team: 'Core 2', weekday: 5, time: '21:30' }, // Viernes
	{ team: 'Core 3', weekday: 6, time: '17:00' }, // Sábado
	{ team: 'Core 3', weekday: 0, time: '17:00' } // Domingo
];
