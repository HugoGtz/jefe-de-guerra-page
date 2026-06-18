/**
 * Datos de "Comunidad viva": Discord y horarios de raid.
 *
 * Todos los horarios están en hora de servidor (ST). El countdown ancla "ST"
 * a la zona del reino (US Central) para ser fiable en cualquier huso del
 * visitante; ver `$lib/utils/nextRaid`. La UI solo muestra la etiqueta "ST".
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

/** Etiqueta horaria mostrada en la UI. Siempre hora de servidor. */
export const raidTimezone = 'ST';

export type RaidNight = {
	/** Equipo asociado opcional (p. ej. "Core 1"). */
	team?: string;
	/** Día de la semana: 0 = Dom, 1 = Lun, … 6 = Sáb. */
	weekday: number;
	/** Hora de inicio en formato 'HH:MM' (hora de servidor, ST). */
	time: string;
};

/**
 * Noches de raid recurrentes durante la semana. El countdown calcula la
 * próxima ocurrencia a partir de esta lista.
 */
// weekday: 0 = Dom, 1 = Lun, 2 = Mar, 3 = Mié, 4 = Jue, 5 = Vie, 6 = Sáb.
export const raidNights: RaidNight[] = [
	{ team: 'Core 1', weekday: 1, time: '19:00' }, // Lunes
	{ team: 'Core 1', weekday: 4, time: '19:00' }, // Jueves
	{ team: 'Core 1', weekday: 0, time: '19:00' }, // Domingo
	{ team: 'Core 2', weekday: 2, time: '19:00' }, // Martes
	{ team: 'Core 2', weekday: 3, time: '19:00' }, // Miércoles
	{ team: 'Core 2', weekday: 4, time: '19:00' }, // Jueves
	{ team: 'Core 3', weekday: 6, time: '20:00' }, // Sábado
	{ team: 'Core 3', weekday: 0, time: '20:00' }, // Domingo
	{ team: 'Core 4', weekday: 4, time: '07:30' }, // Jueves
	{ team: 'Core 4', weekday: 5, time: '07:30' }, // Viernes
	{ team: 'Core 4', weekday: 6, time: '07:30' }, // Sábado
	{ team: 'Core 5', weekday: 1, time: '19:00' }, // Lunes
	{ team: 'Core 5', weekday: 0, time: '18:00' }, // Domingo
	{ team: 'Core 6', weekday: 4, time: '17:30' }, // Jueves
	{ team: 'Core 6', weekday: 0, time: '17:30' } // Domingo
];
