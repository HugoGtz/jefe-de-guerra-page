<script lang="ts">
	import { page } from '$app/stores';
	import { reveal } from '$lib/actions/reveal';
	import type { Guild } from '$lib/data/guild';
	import type { Recruitment } from '$lib/data/recruitment';

	// Datos de SSR (+layout.server.ts), expuestos vía $page.data en el layout.
	const guild = $derived($page.data.guild as Guild);
	const recruitment = $derived($page.data.recruitment as Recruitment);
</script>

<svelte:head>
	<title>Aviso de Privacidad · {guild.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="legal">
	<div class="legal__inner">
		<a href="/" class="legal__back" use:reveal><span aria-hidden="true">←</span> Volver al inicio</a
		>

		<h1 class="legal__title text-engraved" use:reveal={{ delay: 40 }}>Aviso de Privacidad</h1>
		<p class="legal__updated" use:reveal={{ delay: 60 }}>Última actualización: agosto de 2026</p>

		<div class="legal__body" use:reveal={{ delay: 80 }}>
			<section>
				<h2>¿Quiénes somos?</h2>
				<p>
					{guild.name} es una hermandad (guild) de World of Warcraft — {guild.game} en el servidor
					{guild.server}. Este sitio es un proyecto hecho por y para la comunidad, sin fines de
					lucro y sin afiliación con Blizzard Entertainment.
				</p>
			</section>

			<section>
				<h2>¿Qué datos recabamos?</h2>
				<p>
					Cuando aplicas a la guild a través del formulario de este sitio, recabamos: nombre de tu
					personaje, clase y especialización, nivel de objeto (ilvl), enlace a tus logs de combate
					(WarcraftLogs), tu experiencia previa, disponibilidad de horario y cualquier mensaje que
					decidas agregar.
				</p>
				<p>
					Si perteneces al equipo de oficiales con acceso al panel administrativo, guardamos tu
					nombre de usuario y una versión cifrada (hash) de tu contraseña — nunca la contraseña en
					texto plano.
				</p>
			</section>

			<section>
				<h2>¿Para qué usamos tus datos?</h2>
				<ul>
					<li>Evaluar tu aplicación para unirte a la hermandad.</li>
					<li>Contactarte por Discord u otro medio que hayas proporcionado.</li>
					<li>
						Mostrar contenido público del sitio (hazañas, salón de la fama, progreso de raid) usando
						datos de tu personaje obtenidos de WarcraftLogs, una plataforma pública de terceros
						ajena a nosotros.
					</li>
				</ul>
			</section>

			<section>
				<h2>¿Con quién compartimos tus datos?</h2>
				<p>
					Tu aplicación se envía automáticamente a un canal privado de Discord, visible solo para
					los oficiales de la hermandad. No vendemos ni compartimos tus datos con terceros con fines
					publicitarios.
				</p>
			</section>

			<section>
				<h2>¿Cuánto tiempo los guardamos?</h2>
				<p>
					Guardamos las aplicaciones el tiempo necesario para revisarlas y llevar un histórico
					interno de la hermandad. Puedes pedir que se elimine tu información en cualquier momento.
				</p>
			</section>

			<section>
				<h2>Tus derechos</h2>
				<p>
					Puedes solicitar acceder, corregir o eliminar tus datos personales en cualquier momento.
					Para ejercerlos, contáctanos por
					{#if recruitment?.discordUrl}
						<a href={recruitment.discordUrl} target="_blank" rel="noreferrer">Discord</a>
					{:else}
						Discord
					{/if}.
				</p>
			</section>

			<section>
				<h2>Cambios a este aviso</h2>
				<p>
					Podemos actualizar este aviso ocasionalmente. Cualquier cambio se publicará en esta misma
					página.
				</p>
			</section>
		</div>
	</div>
</div>

<style>
	.legal {
		padding: clamp(4rem, 9vw, 7rem) var(--spacing-2xl);
	}
	.legal__inner {
		max-width: 42rem;
		margin: 0 auto;
	}
	.legal__back {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-2xs);
		color: var(--color-steel);
		text-decoration: none;
		font-size: var(--text-sm);
		margin-bottom: var(--spacing-3xl);
		transition: color 0.2s ease;
	}
	.legal__back:hover {
		color: var(--color-lava);
	}
	.legal__title {
		font-size: clamp(1.8rem, 4vw, 2.4rem);
		font-weight: 900;
		margin: 0 0 var(--spacing-xs);
	}
	.legal__updated {
		color: var(--color-steel-dim);
		font-size: var(--text-sm);
		margin: 0 0 var(--spacing-4xl);
	}
	.legal__body :global(section) {
		margin-bottom: var(--spacing-3xl);
	}
	.legal__body :global(h2) {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		font-weight: 700;
		color: var(--color-silver);
		margin: 0 0 var(--spacing-md);
	}
	.legal__body :global(p) {
		color: var(--color-steel);
		line-height: 1.7;
		margin: 0 0 var(--spacing-md);
	}
	.legal__body :global(p:last-child) {
		margin-bottom: 0;
	}
	.legal__body :global(ul) {
		margin: 0;
		padding-left: 1.2rem;
		color: var(--color-steel);
		line-height: 1.7;
	}
	.legal__body :global(li) {
		margin-bottom: var(--spacing-2xs);
	}
	.legal__body :global(a) {
		color: var(--color-lava);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
