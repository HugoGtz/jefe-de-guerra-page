/**
 * Datos de reclutamiento: clases/roles buscados e invite de Discord.
 */

export type RecruitNeed = {
	/** Clase o rol en español. */
	label: string;
	/** Demanda relativa para resaltar prioridades. */
	priority: 'alta' | 'media' | 'baja';
};

export type Recruitment = {
	/** Texto motivador corto. */
	intro: string;
	/** Roles/clases que se buscan. */
	needs: RecruitNeed[];
	/** Requisitos breves. */
	requirements: string[];
	/** Invite de Discord. */
	discordUrl: string;
	/** Invite del grupo de WhatsApp. */
	whatsappUrl: string;
	/**
	 * URL del webhook de Discord al que el formulario de aplicación envía los
	 * datos. Por defecto VACÍA: en ese caso el formulario NO hace POST y dirige
	 * al recluta a aplicar por Discord (comportamiento seguro por defecto).
	 *
	 * AVISO DE SEGURIDAD: este sitio es estático, así que una URL de webhook aquí
	 * queda EXPUESTA públicamente en el bundle del cliente. Cualquiera puede
	 * extraerla y spamear/abusar del canal de Discord. Para producción, considera
	 * NO ponerla aquí y en su lugar enrutar el POST por un endpoint propio (p. ej.
	 * una Cloudflare Pages Function) que guarde el webhook como secreto del
	 * servidor y aplique rate limiting. Mantener vacío por defecto.
	 */
	applyWebhookUrl: string;
};

export const recruitment: Recruitment = {
	intro:
		'Buscamos reforzar el roster de cara a la Fase 2. Si quieres progresar en SSC y TK con un grupo serio pero sin dramas, este es tu sitio.',

	needs: [
		{ label: 'Chamán elemental', priority: 'alta' },
		{ label: 'Chamán mejora', priority: 'alta' },
		{ label: 'Chamán restauración', priority: 'alta' },
		{ label: 'Druida tanque', priority: 'media' },
		{ label: 'Paladín protección', priority: 'media' },
		{ label: 'Druida balance', priority: 'alta' },
		{ label: 'Brujos', priority: 'media' },
		{ label: 'Cazadores', priority: 'baja' },
		{ label: 'Sacerdote sombras', priority: 'media' }
	],

	requirements: [
		'Disponibilidad para los días de raid fijados.',
		'Buena actitud y mecánicas aprendidas.',
		'Discord con micrófono.'
	],

	discordUrl: 'https://discord.com/invite/szcrkmkQQM',
	whatsappUrl: 'https://chat.whatsapp.com/HHJkkOgIq7KB2iTZd0CcB5?s=cl&p=i&ilr=1',

	// TODO: dejar VACÍO salvo que se decida postear directo al webhook (ver aviso
	// de seguridad arriba). Lo recomendable es un proxy de servidor.
	applyWebhookUrl: ''
};
