<script lang="ts">
	import Section from '$lib/components/layout/Section.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import { reveal, type RevealDirection } from '$lib/actions/reveal';
	import { tilt } from '$lib/actions/tilt';
	import { teams, type RaidProgress } from '$lib/data/teams';

	// Estado de revelado por equipo: arranca en 0 y salta al valor real
	// on-reveal, para que las barras hagan el barrido animado al entrar.
	let revealed = $state<Record<string, boolean>>({});

	function pct(p: RaidProgress): number {
		return p.total === 0 ? 0 : Math.round((p.kills / p.total) * 100);
	}

	// Valor de barra: 0 hasta que el equipo se revela (dispara la transición).
	function barValue(teamId: string, p: RaidProgress): number {
		return revealed[teamId] ? pct(p) : 0;
	}

	// Direcciones alternas para un escalonado más vivo (cicla con i % length,
	// así sirve para cualquier número de equipos).
	const directions: RevealDirection[] = ['left', 'up', 'right'];

	// Conteo dinámico: escala a N equipos. Palabra para 1–12, dígito si hay más.
	const numberWords = [
		'cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis',
		'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'
	];
	const countWord = teams.length <= 12 ? numberWords[teams.length] : String(teams.length);
	const countLabel = countWord.charAt(0).toUpperCase() + countWord.slice(1);
	const rosterNoun = teams.length === 1 ? 'roster marcha' : 'rosters marchan';

	// Zona horaria de referencia para la nota compartida (tomada del primer
	// equipo; todos comparten la misma zona). undefined si no hay equipos.
	const scheduleTimezone = teams[0]?.schedule.timezone;
</script>

<Section id="equipos" eyebrow="La hueste" title="Equipos de Raid">
	<p class="intro" use:reveal>
		{countLabel} {rosterNoun} bajo el mismo estandarte. Cada uno con su propio
		horario y su propio avance hacia la cima de la Fase 2.
	</p>

	{#if scheduleTimezone}
		<p class="tz-note" use:reveal={{ delay: 60 }}>
			Horarios en {scheduleTimezone} (hora peninsular de España).
		</p>
	{/if}

	<div class="grid">
		{#each teams as team, i (team.id)}
			<div
				class="cell"
				use:reveal={{
					delay: 80 + i * 110,
					direction: directions[i % directions.length],
					onreveal: () => (revealed[team.id] = true)
				}}
			>
				<div use:tilt={{ max: 5 }} class="cell__tilt">
					<Card beam={team.recruiting} class="team-card">
						<header class="team-card__head">
							<h3 class="team-card__name text-engraved">{team.name}</h3>
							{#if team.recruiting}
								<span class="pill pill--open">Reclutando</span>
							{:else}
								<span class="pill pill--closed">Cerrado</span>
							{/if}
						</header>

						<p class="team-card__schedule">
							<span class="team-card__days">{team.schedule.days}</span>
							<span class="team-card__sep" aria-hidden="true">·</span>
							<span class="team-card__time">{team.schedule.time}</span>
							<span class="team-card__tz">{team.schedule.timezone}</span>
						</p>

						<div class="bars">
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
					</Card>
				</div>
			</div>
		{/each}
	</div>
</Section>

<style>
	.intro {
		max-width: 42rem;
		margin: 0 auto clamp(2.5rem, 5vw, 3.5rem);
		text-align: center;
		font-size: 1.05rem;
		line-height: 1.7;
		color: var(--color-steel);
	}

	.tz-note {
		max-width: 42rem;
		margin: -1.5rem auto clamp(2rem, 4vw, 2.75rem);
		text-align: center;
		font-size: 0.8rem;
		color: var(--color-steel-dim);
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
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
	}

	.team-card__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.85rem;
	}
	.team-card__name {
		font-family: var(--font-display);
		font-size: 1.4rem;
		font-weight: 900;
		letter-spacing: 0.04em;
		margin: 0;
	}

	/* Pastilla de estado — variantes lava/blood (abierto) y acero (cerrado). */
	.pill {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.28rem 0.7rem;
		border-radius: 999px;
		font-family: var(--font-display);
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		white-space: nowrap;
		border: 1px solid transparent;
	}
	.pill--open {
		color: var(--color-silver);
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--color-blood) 45%, transparent),
			color-mix(in srgb, var(--color-lava) 30%, transparent)
		);
		border-color: color-mix(in srgb, var(--color-lava) 60%, transparent);
		box-shadow: 0 0 12px rgba(255, 59, 33, 0.35);
	}
	.pill--open::before {
		content: '';
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background-color: var(--color-lava);
		box-shadow: 0 0 8px rgba(255, 59, 33, 0.8);
		animation: pill-blink 1.8s ease-in-out infinite;
	}
	.pill--closed {
		color: var(--color-steel-dim);
		background-color: color-mix(in srgb, var(--color-steel) 12%, transparent);
		border-color: color-mix(in srgb, var(--color-steel) 24%, transparent);
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

	.bars {
		display: grid;
		gap: 0.85rem;
	}

	.team-card__note {
		margin: 1.1rem 0 0;
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--color-steel-dim);
	}

	@keyframes pill-blink {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.4;
			transform: scale(0.78);
		}
	}

	/* 1 col → 2 → 3. Con 5 tarjetas la rejilla de 3 columnas queda 3 + 2,
	   equilibrada y centrada. */
	@media (min-width: 600px) {
		.grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (min-width: 920px) {
		.grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pill--open::before {
			animation: none;
		}
	}
</style>
