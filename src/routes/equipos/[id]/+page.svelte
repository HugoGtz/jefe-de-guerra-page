<script lang="ts">
	import CoreHeader from '$lib/components/team/CoreHeader.svelte';
	import RosterMember from '$lib/components/team/RosterMember.svelte';
	import { reveal } from '$lib/actions/reveal';

	// Datos de SSR (+page.server.ts): el equipo (ya con override WCL de SSC/TK)
	// y su roster derivado de los logs recientes (puede ser null/vacío).
	let { data } = $props();

	const team = $derived(data.team);
	const roster = $derived(data.roster);
	const hasRoster = $derived(!!roster && roster.length > 0);
</script>

<svelte:head>
	<title>{team.name} · Roster — Jefe de Guerra</title>
	<meta
		name="description"
		content={`Roster de ${team.name} de la hermandad Jefe de Guerra (Dreamscythe, TBC Classic), derivado de los logs recientes de SSC y Tempest Keep.`}
	/>
</svelte:head>

<main class="core">
	<div class="core__inner">
		<a href="/#equipos" class="core__back" use:reveal>
			<span aria-hidden="true">←</span> Volver a Equipos
		</a>

		<!-- ── Cabecera del core ── -->
		<div use:reveal={{ delay: 60 }}>
			<CoreHeader {team} />
		</div>

		<!-- ── Roster ── -->
		<section class="roster" aria-labelledby="roster-title">
			<header class="roster__head" use:reveal>
				<h2 id="roster-title" class="roster__title text-engraved">Roster</h2>
				<span class="roster__rule" aria-hidden="true"></span>
			</header>

			{#if hasRoster && roster}
				<p class="roster__hint" use:reveal={{ delay: 40 }}>
					Derivado de los logs recientes de SSC y Tempest Keep (WarcraftLogs).
				</p>
				<ul class="m-0 grid list-none grid-cols-1 gap-lg p-0 sm:grid-cols-2 lg:grid-cols-3">
					{#each roster as member, i (member.name)}
						<li use:reveal={{ delay: Math.min(i * 50, 400), blur: true }}>
							<RosterMember {member} />
						</li>
					{/each}
				</ul>
			{:else}
				<div class="roster__empty" use:reveal={{ delay: 40 }}>
					<p class="roster__empty-title">Aún no hay logs recientes para este core.</p>
					<p class="roster__empty-sub">
						El roster se construye a partir de los logs de SSC y Tempest Keep en WarcraftLogs;
						cuando este core registre nuevos parses aparecerán aquí.
					</p>
				</div>
			{/if}
		</section>
	</div>
</main>

<style>
	.core {
		position: relative;
		padding: clamp(2.5rem, 6vw, 5rem) 1.25rem clamp(4rem, 9vw, 7rem);
	}
	.core__inner {
		max-width: 64rem;
		margin: 0 auto;
	}

	/* Enlace de vuelta */
	.core__back {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-2xs);
		font-family: var(--font-display);
		font-size: var(--text-xs);
		font-weight: 700;
		letter-spacing: var(--tracking-eyebrow);
		text-transform: uppercase;
		text-decoration: none;
		color: var(--color-steel);
		transition:
			color 0.2s ease,
			transform 0.2s ease;
	}
	.core__back:hover {
		color: var(--color-ember);
		transform: translateX(-2px);
	}
	.core__back:focus-visible {
		outline: 2px solid var(--color-lava);
		outline-offset: 3px;
		border-radius: var(--radius-sm);
	}

	/* Roster */
	.roster {
		margin-top: clamp(2.5rem, 5vw, 3.5rem);
	}
	.roster__head {
		display: flex;
		align-items: center;
		gap: var(--spacing-xl);
		margin-bottom: var(--spacing-2xs);
	}
	.roster__title {
		font-family: var(--font-display);
		font-size: clamp(1.4rem, 4vw, 1.9rem);
		font-weight: 900;
		letter-spacing: var(--tracking-heading);
		text-transform: uppercase;
		margin: 0;
		flex-shrink: 0;
	}
	.roster__rule {
		flex: 1;
		height: 1px;
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--color-lava) 55%, transparent),
			transparent
		);
	}
	.roster__hint {
		margin: 0 0 var(--spacing-3xl);
		font-size: var(--text-sm);
		color: var(--color-steel-dim);
	}

	/* Estado vacío */
	.roster__empty {
		padding: clamp(2rem, 5vw, 3rem);
		text-align: center;
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--color-stone) 55%, transparent);
		border: 1px dashed color-mix(in srgb, var(--color-steel) 24%, transparent);
	}
	.roster__empty-title {
		font-family: var(--font-display);
		font-size: var(--text-md);
		font-weight: 700;
		letter-spacing: var(--tracking-snug);
		color: var(--color-silver);
		margin: 0 0 var(--spacing-sm);
	}
	.roster__empty-sub {
		max-width: 36rem;
		margin: 0 auto;
		font-size: var(--text-sm);
		line-height: 1.6;
		color: var(--color-steel-dim);
	}

	@media (prefers-reduced-motion: reduce) {
		.core__back:hover {
			transform: none;
		}
	}
</style>
