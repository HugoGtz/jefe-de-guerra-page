<script lang="ts">
	import Section from '$lib/components/layout/Section.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import StatusPill from '$lib/components/ui/StatusPill.svelte';
	import { reveal, type RevealDirection } from '$lib/actions/reveal';
	import { tilt } from '$lib/actions/tilt';
	import {
		guildLogsUrl,
		wclGuildUrl,
		wclCalendarUrl,
		type Team,
		type RaidProgress
	} from '$lib/data/teams';

	let { teams }: { teams: Team[] } = $props();

	// Estado de revelado por equipo: arranca en 0 y salta al valor real
	// on-reveal, para que las barras hagan el barrido animado al entrar.
	let revealed = $state<Record<string, boolean>>({});

	// El porcentaje viene ya calculado del servidor (p.percent); 0 de respaldo.
	const pct = (p: RaidProgress): number => p.percent ?? 0;

	// Valor de barra: 0 hasta que el equipo se revela (dispara la transición).
	function barValue(teamId: string, p: RaidProgress): number {
		return revealed[teamId] ? pct(p) : 0;
	}

	// Direcciones alternas para un escalonado más vivo (cicla con i % length,
	// así sirve para cualquier número de equipos).
	const directions: RevealDirection[] = ['left', 'up', 'right'];

	// Conteo dinámico: escala a N equipos. Palabra para 1–12, dígito si hay más.
	const numberWords = [
		'cero',
		'un',
		'dos',
		'tres',
		'cuatro',
		'cinco',
		'seis',
		'siete',
		'ocho',
		'nueve',
		'diez',
		'once',
		'doce'
	];
	const countWord = $derived(teams.length <= 12 ? numberWords[teams.length] : String(teams.length));
	const countLabel = $derived(countWord.charAt(0).toUpperCase() + countWord.slice(1));
	const rosterNoun = $derived(teams.length === 1 ? 'roster marcha' : 'rosters marchan');

	// Etiqueta horaria para la nota compartida (tomada del primer equipo;
	// todos usan hora de servidor). undefined si no hay equipos.
	const scheduleTimezone = $derived(teams[0]?.schedule.timezone);
</script>

<Section id="equipos" eyebrow="La hueste" title="Equipos de Raid">
	<p class="intro" use:reveal>
		{countLabel}
		{rosterNoun} bajo el mismo estandarte. Cada uno con su propio horario y su propio avance hacia la
		cima de la Fase 2.
	</p>

	{#if scheduleTimezone}
		<p class="tz-note" use:reveal={{ delay: 60 }}>
			Horarios en hora de servidor ({scheduleTimezone}).
		</p>
	{/if}

	<div class="logs-cta mx-auto flex justify-center" use:reveal={{ delay: 90 }}>
		<Button variant="ghost" href={guildLogsUrl} target="_blank" rel="noopener noreferrer">
			Ver nuestros logs
		</Button>
	</div>

	<div class="grid grid-cols-1 gap-6 min-[600px]:grid-cols-2 min-[920px]:grid-cols-3">
		{#each teams as team, i (team.id)}
			<div
				use:reveal={{
					delay: 80 + i * 110,
					direction: directions[i % directions.length],
					onreveal: () => (revealed[team.id] = true)
				}}
			>
				<div use:tilt={{ max: 5 }} class="cell__tilt">
					<Card beam={team.recruiting} class="team-card">
						<!-- Enlace estirado: cubre toda la tarjeta (::after inset:0) sin
						     anidar <a> dentro de <a>. Los enlaces internos (Logs/Calendario)
						     se elevan con z-index para seguir siendo clicables encima. -->
						<a
							class="team-card__overlay"
							href="/equipos/{team.id}"
							aria-label="Ver roster de {team.name}"
						></a>
						<header class="mb-[0.85rem] flex items-center justify-between gap-3">
							<h3 class="team-card__name text-engraved">{team.name}</h3>
							<StatusPill open={team.recruiting} />
						</header>

						<p class="team-card__schedule">
							<span class="team-card__days">{team.schedule.days}</span>
							{#if team.schedule.time}
								<span class="team-card__sep" aria-hidden="true">·</span>
								<span class="team-card__time">{team.schedule.time}</span>
								<span class="team-card__tz">{team.schedule.timezone}</span>
							{/if}
						</p>

						<div class="grid gap-[0.85rem]">
							<ProgressBar
								value={barValue(team.id, team.ssc)}
								label={`SSC ${team.ssc.kills}/${team.ssc.total}`}
								complete={team.ssc.kills >= team.ssc.total}
							/>
							<ProgressBar
								value={barValue(team.id, team.tk)}
								label={`TK ${team.tk.kills}/${team.tk.total}`}
								complete={team.tk.kills >= team.tk.total}
							/>
						</div>

						{#if team.note}
							<p class="team-card__note">{team.note}</p>
						{/if}

						{#if team.wclGuildId}
							<div class="team-card__links">
								<a
									class="team-card__logs label-caps"
									href={wclGuildUrl(team.wclGuildId)}
									target="_blank"
									rel="noopener noreferrer"
								>
									Logs
									<span class="team-card__logs-arrow" aria-hidden="true">↗</span>
								</a>
								<a
									class="team-card__logs label-caps"
									href={wclCalendarUrl(team.wclGuildId)}
									target="_blank"
									rel="noopener noreferrer"
								>
									Calendario
									<span class="team-card__logs-arrow" aria-hidden="true">↗</span>
								</a>
							</div>
						{/if}

						<!-- Afordancia visible de que la tarjeta abre el roster. El enlace
						     accesible es el overlay estirado; este texto es decorativo. -->
						<p class="team-card__roster-cue label-caps" aria-hidden="true">
							Ver roster <span class="team-card__roster-arrow">→</span>
						</p>
					</Card>
				</div>
			</div>
		{/each}
	</div>
</Section>

<style>
	/* Tipografía con tamaños fuera de la escala de Tailwind → clase scoped
	   (más legible que utilidades arbitrarias). Layout va por utilidades. */
	.intro {
		max-width: 42rem;
		margin-inline: auto;
		margin-bottom: clamp(2.5rem, 5vw, 3.5rem);
		text-align: center;
		font-size: 1.05rem;
		line-height: 1.7;
		color: var(--color-steel);
	}
	.tz-note {
		max-width: 42rem;
		margin-inline: auto;
		margin-top: -1.5rem;
		margin-bottom: clamp(2rem, 4vw, 2.75rem);
		text-align: center;
		font-size: 0.8rem;
		color: var(--color-steel-dim);
	}
	/* Solo los márgenes custom; flex/justify/mx-auto van por utilidades. */
	.logs-cta {
		margin-top: -0.75rem;
		margin-bottom: clamp(2.5rem, 5vw, 3.5rem);
	}

	/* El wrapper de celda lleva el `reveal` (transform/opacity); el hijo
	   `.cell__tilt` lleva el `tilt` (su propio transform). Separados para que
	   no se pisen. */
	.cell__tilt {
		height: 100%;
	}
	:global(.team-card) {
		height: 100%;
		display: flex;
		flex-direction: column;
		position: relative;
	}

	/* Enlace estirado al detalle del core: invisible, cubre toda la tarjeta. */
	.team-card__overlay {
		position: absolute;
		inset: 0;
		z-index: 0;
		border-radius: inherit;
		text-indent: -9999px;
		overflow: hidden;
	}
	.team-card__overlay::after {
		content: '';
		position: absolute;
		inset: 0;
	}
	/* Afordancia de hover (cursor + leve elevación) sobre toda la tarjeta. */
	.cell__tilt:hover {
		cursor: pointer;
	}
	/* El foco del enlace estirado resalta TODA la tarjeta (no solo el overlay
	   invisible), dando un foco de teclado claramente visible. */
	.team-card__overlay:focus-visible {
		outline: none;
	}
	:global(.team-card):has(.team-card__overlay:focus-visible) {
		outline: 2px solid var(--color-lava);
		outline-offset: 3px;
	}

	/* Afordancia "Ver roster →": señal visible de que la tarjeta es clicable
	   (clave en táctil, donde no hay hover). Anclada al fondo de la tarjeta. */
	.team-card__roster-cue {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin: 1.1rem 0 0;
		margin-top: auto;
		padding-top: 1.1rem;
		font-size: 0.74rem;
		color: var(--color-ember);
		transition:
			color 0.2s ease,
			transform 0.2s ease;
	}
	/* Cuando hay fila de enlaces (Logs/Calendario), esa fila ya está anclada
	   abajo; el cue la sigue sin volver a empujar con auto. */
	.team-card__links + .team-card__roster-cue {
		margin-top: 0.55rem;
		padding-top: 0;
	}
	.team-card__roster-arrow {
		transition: transform 0.2s ease;
	}
	/* Hover sobre cualquier parte de la tarjeta anima la flecha del cue. */
	.cell__tilt:hover .team-card__roster-cue {
		color: var(--color-lava);
	}
	.cell__tilt:hover .team-card__roster-arrow {
		transform: translateX(3px);
	}

	.team-card__name {
		font-family: var(--font-display);
		font-size: 1.4rem;
		font-weight: 900;
		letter-spacing: 0.04em;
		margin: 0;
	}

	.team-card__schedule {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0 0 1.25rem;
		font-size: 0.85rem;
		color: var(--color-steel-dim);
	}
	.team-card__days {
		font-family: var(--font-display);
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--color-steel);
	}
	.team-card__sep {
		color: var(--color-ember);
	}
	.team-card__time {
		font-family: var(--font-display);
		font-weight: 700;
		color: var(--color-ember);
	}
	.team-card__tz {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ash);
		background-color: var(--color-steel);
		padding: 0.08rem 0.4rem;
		border-radius: 3px;
		align-self: center;
	}

	.team-card__note {
		margin: 1.1rem 0 0;
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--color-steel-dim);
	}

	/* Fila de enlaces WCL del core (Logs · Calendario). Anclada al fondo
	   de la tarjeta para que todas las tarjetas alineen sus enlaces. */
	.team-card__links {
		display: flex;
		flex-wrap: wrap;
		gap: 1.25rem;
		margin-top: auto;
		padding-top: 1.1rem;
		/* Por encima del enlace estirado para que Logs/Calendario sigan
		   siendo clicables (sin anidar <a> dentro de <a>). */
		position: relative;
		z-index: 1;
	}

	/* Enlace sutil a WCL del core. Acento acero → lava al pasar. */
	.team-card__logs {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.72rem;
		text-decoration: none;
		color: var(--color-steel);
		border-bottom: 1px solid color-mix(in srgb, var(--color-steel) 35%, transparent);
		transition:
			color 0.2s ease,
			border-color 0.2s ease,
			transform 0.2s ease;
	}
	.team-card__logs:hover {
		color: var(--color-ember);
		border-color: color-mix(in srgb, var(--color-lava) 60%, transparent);
		transform: translateY(-1px);
	}
	.team-card__logs:focus-visible {
		outline: 2px solid var(--color-lava);
		outline-offset: 2px;
	}
	.team-card__logs-arrow {
		font-size: 0.85em;
		transition: transform 0.2s ease;
	}
	.team-card__logs:hover .team-card__logs-arrow {
		transform: translate(1px, -1px);
	}

	@media (prefers-reduced-motion: reduce) {
		.team-card__logs:hover,
		.team-card__logs:hover .team-card__logs-arrow,
		.cell__tilt:hover .team-card__roster-arrow {
			transform: none;
		}
	}
</style>
