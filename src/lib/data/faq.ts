/**
 * Preguntas frecuentes para reclutas potenciales.
 * Contenido PLACEHOLDER: revisar y confirmar con el oficial de guild.
 */

export type FaqItem = {
	/** Pregunta (texto del encabezado del acordeón). */
	q: string;
	/** Respuesta (puede incluir varias frases). */
	a: string;
};

// TODO: confirmar con el usuario — todas las respuestas son provisionales.
export const faq: FaqItem[] = [
	{
		q: '¿Qué sistema de reparto de botín usáis?',
		a: 'Usamos Loot Council para el contenido de progresión: un grupo de oficiales reparte el equipo según mejora real del raid, asistencia y rendimiento. En contenido en farmeo pasamos a Soft Reserve (SR) para agilizar. La prioridad siempre es el progreso del grupo, no las estadísticas individuales.'
	},
	{
		q: '¿Qué addons son obligatorios?',
		a: 'Pedimos Deadly Boss Mods (DBM) o BigWigs para los avisos de mecánicas, un medidor de daño/sanación (Details! o Recount) y WeakAuras para las mecánicas concretas de cada jefe. Compartimos nuestros paquetes de WeakAuras en Discord antes de cada raid nuevo.'
	},
	{
		q: '¿Cuál es la política de asistencia?',
		a: 'No exigimos asistencia perfecta, pero sí avisar con antelación si no vas a poder asistir. Para entrar al roster de progresión pedimos una asistencia aproximada del 75% en las noches de raid fijadas. La vida real va primero; lo único que pedimos es comunicación.'
	},
	{
		q: '¿Qué consumibles y encantamientos se esperan?',
		a: 'Que vengas con la mejor preparación razonable para tu nivel: comida de buff, elixires/pociones de flask, piedras de salud/maná y los encantamientos y gemas adecuados en todas las piezas. No hace falta que seas BiS, pero sí presentarte listo para rendir.'
	},
	{
		q: '¿Hay requisito de edad o idioma?',
		a: 'Somos una comunidad mayoritariamente hispanohablante, así que el idioma de la guild es el español. Pedimos +18 por el ambiente del Discord de voz, aunque valoramos cada caso. Lo importante es buena actitud y saber estar.'
	},
	{
		q: '¿Necesito experiencia previa de raid?',
		a: 'No es imprescindible, pero ayuda. Valoramos más la actitud, la disposición a aprender mecánicas y la constancia que tu historial. Si vienes de otro servidor o expansión, cuéntanoslo y lo tendremos en cuenta en la prueba.'
	},
	{
		q: '¿Qué días y horario raideáis?',
		a: 'Raideamos en horario de noche entre semana (zona horaria europea). Los días concretos los confirmamos en el Discord según la fase actual. Avisamos con antelación de cualquier raid extra de progresión.'
	},
	{
		q: '¿Cómo aplico a la guild?',
		a: 'Rellena el formulario de aplicación de esta página o escríbenos directamente por Discord. Cuéntanos tu clase, especialización, experiencia y disponibilidad, y un oficial te contactará para una prueba en el próximo raid.'
	}
];
