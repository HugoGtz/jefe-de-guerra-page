<script lang="ts">
	import Section from '$lib/components/layout/Section.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import RaidCard from '$lib/components/sections/RaidCard.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { countUp } from '$lib/actions/countUp';
	import type { Phase, Raid } from '$lib/data/raids';

	// Forma de las stats (espejo de GuildStats en $lib/server/data). Local para
	// no importar código server-only en un componente de cliente.
	type GuildStats = {
		phase2BossesDown: number;
		phase2BossesTotal: number;
		activeCores: number;
		lastFeat: { boss: string; date: string; team?: string } | null;
		killsLast30Days: number;
		topCore: { name: string; kills: number } | null;
		fullClearCores: number;
	};

	let { phases, stats }: { phases: Phase[]; stats?: GuildStats } = $props();

	// Fecha de la última hazaña formateada en es-ES (corta), o null.
	const lastFeatLabel = $derived(
		stats?.lastFeat
			? new Date(stats.lastFeat.date + 'T00:00:00').toLocaleDateString('es-ES', {
					day: 'numeric',
					month: 'short'
				})
			: null
	);

	// Fase 1 (completada) y Fase 2 (en progreso), por orden en el array.
	const phaseOne = $derived(phases[0]);
	const phaseTwo = $derived(phases[1]);

	// Estado de revelado por raid (solo Fase 1): arranca en 0 y salta al valor
	// real on-reveal, para que las barras hagan el barrido animado al entrar.
	// Las tarjetas de Fase 2 encapsulan su propio estado en RaidCard.
	let revealed = $state<Record<string, boolean>>({});

	function barValue(raid: Raid): number {
		return revealed[raid.id] ? raid.percent : 0;
	}

	// Estadísticas agregadas para la tira animada (contadores).
	const allRaids = $derived([...phaseOne.raids, ...phaseTwo.raids]);
	const totalBossesDefeated = $derived(allRaids.reduce((acc, r) => acc + r.kills, 0));
	const totalRaids = $derived(allRaids.length);
</script>

<Section id="progreso" eyebrow="Progreso" title="Avance de raids" class="raids">
	<!-- ── TIRA DE ESTADÍSTICAS (contadores animados) ──────────── -->
	<!-- Cuando hay datos de WCL mostramos jefes Fase 2 / cores / última hazaña;
	     si no, caemos a las stats agregadas de siempre (bosses / raids). -->
	<div class="stats" use:reveal>
		<div class="stat">
			<span class="stat__value text-lava-glow" use:countUp={{ to: phaseOne.percent, suffix: '%' }}
				>{phaseOne.percent}%</span
			>
			<span class="stat__label">Fase 1</span>
		</div>

		{#if stats}
			<div class="stat">
				<span class="stat__value text-lava-glow" use:countUp={{ to: stats.phase2BossesDown }}
					>{stats.phase2BossesDown}</span
				><span class="stat__suffix">/{stats.phase2BossesTotal}</span>
				<span class="stat__label">Jefes Fase 2</span>
			</div>
			<div class="stat">
				<span class="stat__value text-lava-glow" use:countUp={{ to: stats.activeCores }}
					>{stats.activeCores}</span
				>
				<span class="stat__label">Cores activos</span>
			</div>
			{#if stats.lastFeat && lastFeatLabel}
				<div class="stat">
					<span class="stat__value stat__value--text text-lava-glow">{lastFeatLabel}</span>
					<span class="stat__label">Última hazaña</span>
				</div>
			{:else}
				<div class="stat">
					<span
						class="stat__value text-lava-glow"
						use:countUp={{ to: phaseTwo.percent, suffix: '%' }}>{phaseTwo.percent}%</span
					>
					<span class="stat__label">Fase 2</span>
				</div>
			{/if}
		{:else}
			<div class="stat">
				<span class="stat__value text-lava-glow" use:countUp={{ to: totalBossesDefeated }}
					>{totalBossesDefeated}</span
				>
				<span class="stat__label">Bosses derrotados</span>
			</div>
			<div class="stat">
				<span class="stat__value text-lava-glow" use:countUp={{ to: totalRaids }}>{totalRaids}</span
				>
				<span class="stat__label">Raids</span>
			</div>
			<div class="stat">
				<span class="stat__value text-lava-glow" use:countUp={{ to: phaseTwo.percent, suffix: '%' }}
					>{phaseTwo.percent}%</span
				>
				<span class="stat__label">Fase 2</span>
			</div>
		{/if}
	</div>

	<!-- ── FASE 1 — COMPLETADA ─────────────────────────────────── -->
	<div class="phase phase--done" use:reveal>
		<div class="phase__banner phase__banner--done">
			<span class="phase__check" aria-hidden="true">✓</span>
			<div>
				<p class="phase__eyebrow">{phaseOne.label}</p>
				<h3 class="phase__heading text-engraved">{phaseOne.statusLabel}</h3>
			</div>
		</div>

		<div class="phase__bars">
			{#each phaseOne.raids as raid (raid.id)}
				<div use:reveal={{ onreveal: () => (revealed[raid.id] = true) }} class="raid-row">
					<ProgressBar
						value={barValue(raid)}
						label={`${raid.name} · ${raid.kills}/${raid.total}`}
						complete
					/>
				</div>
			{/each}
		</div>
	</div>

	<!-- ── FASE 2 — EN PROGRESO ────────────────────────────────── -->
	<div class="phase phase--active" use:reveal={{ delay: 100 }}>
		<div class="phase__banner phase__banner--active">
			<span class="phase__pulse" aria-hidden="true"></span>
			<div>
				<p class="phase__eyebrow text-lava-glow">{phaseTwo.label}</p>
				<h3 class="phase__heading text-engraved">{phaseTwo.statusLabel}</h3>
			</div>
			<span class="phase__overall" use:countUp={{ to: phaseTwo.percent, suffix: '%' }}
				>{phaseTwo.percent}%</span
			>
		</div>

		<div class="raid-cards">
			{#each phaseTwo.raids as raid (raid.id)}
				<RaidCard {raid} />
			{/each}
		</div>
	</div>
</Section>

<style>
	.stats {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1px;
		margin-bottom: 2.75rem;
		background-color: color-mix(in srgb, var(--color-steel) 14%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-steel) 16%, transparent);
		border-radius: var(--radius-md);
		overflow: hidden;
	}
	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-2xs);
		padding: var(--spacing-3xl) var(--spacing-xl);
		background-color: color-mix(in srgb, var(--color-stone) 78%, transparent);
	}
	.stat__value {
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 5vw, 2.6rem);
		font-weight: 900;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	/* Variante de texto (p. ej. fecha de última hazaña): un poco más pequeña
	   para que quepa sin romper la rejilla. */
	.stat__value--text {
		font-size: clamp(1.3rem, 3.5vw, 1.9rem);
		text-transform: capitalize;
	}
	.stat__suffix {
		font-family: var(--font-display);
		font-size: clamp(1rem, 2.5vw, 1.4rem);
		font-weight: 900;
		line-height: 1;
		color: var(--color-steel-dim);
		font-variant-numeric: tabular-nums;
	}
	.stat__label {
		font-family: var(--font-display);
		font-size: var(--text-xs);
		font-weight: 700;
		letter-spacing: var(--tracking-widest);
		text-transform: uppercase;
		color: var(--color-steel-dim);
		text-align: center;
	}

	.phase {
		margin-bottom: 3rem;
	}
	.phase:last-child {
		margin-bottom: 0;
	}

	.phase__banner {
		display: flex;
		align-items: center;
		gap: var(--spacing-xl);
		padding: var(--spacing-xl) var(--spacing-2xl);
		border-radius: var(--radius-md);
		margin-bottom: var(--spacing-3xl);
	}
	.phase__banner--done {
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--color-ember) 22%, transparent),
			transparent
		);
		border: 1px solid color-mix(in srgb, var(--color-ember) 45%, transparent);
	}
	.phase__banner--active {
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--color-blood) 28%, transparent),
			transparent
		);
		border: 1px solid color-mix(in srgb, var(--color-blood) 55%, transparent);
	}

	.phase__check {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 42px;
		height: 42px;
		border-radius: 50%;
		font-size: var(--text-xl);
		font-weight: 900;
		color: var(--color-ash);
		background: linear-gradient(135deg, var(--color-ember), var(--color-lava));
		box-shadow: 0 0 16px rgba(255, 107, 44, 0.6);
	}
	.phase__pulse {
		flex-shrink: 0;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background-color: var(--color-lava);
		box-shadow: 0 0 10px rgba(255, 59, 33, 0.8);
		animation: phase-blink 1.6s ease-in-out infinite;
	}
	.phase__eyebrow {
		font-family: var(--font-display);
		font-size: var(--text-xs);
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-steel-dim);
		margin: 0 0 var(--spacing-3xs);
	}
	.phase__heading {
		font-size: clamp(1.2rem, 3vw, 1.6rem);
		font-weight: 900;
		letter-spacing: var(--tracking-heading);
		text-transform: uppercase;
		margin: 0;
	}
	.phase__overall {
		margin-left: auto;
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 900;
		color: var(--color-lava);
		text-shadow: 0 0 10px rgba(255, 59, 33, 0.5);
	}

	.phase__bars {
		display: grid;
		gap: var(--spacing-xl);
		max-width: 46rem;
	}

	.raid-cards {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--spacing-3xl);
	}
	@keyframes phase-blink {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.4;
			transform: scale(0.8);
		}
	}
	@media (min-width: 600px) {
		.stats {
			grid-template-columns: repeat(4, 1fr);
		}
	}
	@media (min-width: 768px) {
		.raid-cards {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.phase__pulse {
			animation: none;
		}
	}
</style>
