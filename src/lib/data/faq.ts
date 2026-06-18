/**
 * Preguntas frecuentes para reclutas potenciales.
 * Basadas en el reglamento oficial de la hermandad (semi-hardcore, TBC Classic).
 */

export type FaqItem = {
	/** Pregunta (texto del encabezado del acordeón). */
	q: string;
	/** Respuesta (puede incluir varias frases). */
	a: string;
};

export const faq: FaqItem[] = [
	{
		q: '¿Qué tipo de hermandad es Jefe de Guerra?',
		a: 'Somos una hermandad semi-hardcore de World of Warcraft: The Burning Crusade Classic. Progresamos en serio, con preparación y compromiso, pero manteniendo un buen ambiente hispanohablante. Tenemos varios equipos de raid (Cores) para cubrir distintos horarios.'
	},
	{
		q: '¿Qué addons son obligatorios?',
		a: 'DBM o BigWigs (avisos de mecánicas), Loon BiS (para verificar tu equipo BiS), Gargul (gestión de loot y Soft Reserve) y un addon de aggro (tipo Omen). Deben estar instalados y actualizados antes del raid.'
	},
	{
		q: '¿Qué requisitos de equipo y consumibles piden?',
		a: 'Preséntate con tu Pre-BiS gemado y encantado al máximo nivel disponible. Los consumibles son obligatorios: frascos, elixires y comida de buff. Venir sin consumibles afecta a tu loot (ver sistema de SR).'
	},
	{
		q: '¿Cuál es la política de asistencia?',
		a: 'Para mantener el estatus de Raider Fijo se pide un mínimo del 85% de asistencia mensual. Bajar de ese 85% supone descender a Raider Suplente. La vida real va primero, pero pedimos avisar siempre con antelación.'
	},
	{
		q: '¿Cómo funciona el sistema de loot?',
		a: 'Usamos Soft Reserve (SR) con Gargul. Cada raider parte de 1 SR base. Bonos: +1 SR por puntualidad (estar 10-15 min antes) y +1 SR por traer todos los consumibles (revisión de un oficial). Penalizaciones: -1 SR ese día por superar los 5 min de tolerancia, y -1 SR en la siguiente raid por faltar sin avisar. No se permite hacer SR por off-spec (rama secundaria).'
	},
	{
		q: '¿Hay prioridades de loot por clase o rol?',
		a: 'Sí. Los tanques tienen prioridad en piezas Tier BiS para asegurar la progresión (verificado con Loon BiS por los raid leaders). Los cazadores eligen entre arma a dos manos o dos armas de una mano. Casters y healers eligen entre bastón o set de Main Hand + Off-hand según la fase. De trinkets físicos (Espinazo/Tsunami) máximo 1 por jugador hasta que todos los DPS tengan uno.'
	},
	{
		q: '¿Cómo se reparten las monturas?',
		a: 'Puedes hacer 1 SR por la montura tras cumplir 5 semanas activas en tu core. Además, los jugadores con estatus Full BiS (ya tienen todos sus items BiS) pueden usar sus 3 SR específicamente para la montura.'
	},
	{
		q: '¿Qué rangos hay y cómo progreso?',
		a: 'Entras como Raider Suplente (no rolea armas, trinkets ni monturas). Tras 3 semanas de asistencia constante pasas a Raider Fijo. Si te trasladas a otro core (avisando antes), vuelves a cumplir las 3 semanas para recuperar el estatus.'
	},
	{
		q: '¿Qué sanciones existen?',
		a: 'Bajar del 85% mensual te degrada a Raider Suplente. Cambiar de core sin avisar al Raid Leader con días de antelación puede costarte tu lugar fijo; si reincides, la degradación a Suplente es permanente. La expulsión se reserva para ninjeo comprobado, toxicidad extrema o drama público.'
	},
	{
		q: '¿Cómo aplico a la guild?',
		a: 'Rellena el formulario de aplicación de esta página o escríbenos por Discord. Cuéntanos tu clase, especialización, experiencia y disponibilidad, y un oficial te contactará para una prueba en el próximo raid.'
	}
];
