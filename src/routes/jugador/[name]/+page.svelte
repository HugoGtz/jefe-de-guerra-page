<script lang="ts">
	import PlayerHeader from '$lib/components/player/PlayerHeader.svelte';
	import BossesTable from '$lib/components/player/BossesTable.svelte';
	import AllStarsGrid from '$lib/components/player/AllStarsGrid.svelte';
	import RecentKills from '$lib/components/player/RecentKills.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { specOrClassIcon } from '$lib/wow-icons';
	import { wclCharacterUrl } from '$lib/data/teams';

	// SSR (+page.server.ts): the requested name, the character detail (null when
	// there are no logs) and the recent-kills histórico (possibly empty).
	let { data } = $props();

	const name = $derived(data.name);
	const detail = $derived(data.detail);
	const recent = $derived(data.recent ?? []);
	const hasDetail = $derived(!!detail);

	/** Métrica en mayúsculas para mostrar (DPS / HPS), con respaldo a "Parse". */
	const metricLabel = $derived(detail?.metric ? detail.metric.toUpperCase() : null);

	/** Icono cabecera: spec → clase → null (respaldo a inicial). */
	const headerIcon = $derived(
		detail ? specOrClassIcon(detail.wowClass, detail.mainSpec ?? undefined) : null
	);

	/** Color de clase para teñir el nombre. */
	const nameColor = $derived(detail?.classColor ?? undefined);

	/** Tier del parse medio (calculado en el server). */
	const avgTier = $derived(data.tier);

	/** Posición del jugador en la hermandad (rank en su clase / global), del server. */
	const standing = $derived(data.standing);
</script>

<svelte:head>
	<title>{name} · Parses — Jefe de Guerra</title>
	<meta name="robots" content="noindex" />
	<meta
		name="description"
		content={`Parses de ${name} en SSC y Tempest Keep (Dreamscythe, TBC Classic) — vista interna de la hermandad Jefe de Guerra.`}
	/>
</svelte:head>

<main class="player">
	<div class="player__inner">
		<a href="/#salon-fama" class="player__back" use:reveal>
			<span aria-hidden="true">←</span> Volver al Salón de la Fama
		</a>

		{#if hasDetail && detail}
			<!-- ── Resumen (cabecera) ── -->
			<div use:reveal={{ delay: 60 }}>
				<PlayerHeader {detail} {headerIcon} {nameColor} {avgTier} {standing} {metricLabel} />
			</div>

			<!-- ── Parses por boss ── -->
			{#if detail.bosses.length > 0}
				<section class="block" aria-labelledby="bosses-title">
					<header class="block__head" use:reveal>
						<h2 id="bosses-title" class="block__title text-engraved">Parses por boss</h2>
						<span class="block__rule" aria-hidden="true"></span>
					</header>

					<BossesTable bosses={detail.bosses} {metricLabel} />
				</section>
			{/if}

			<!-- ── All-stars por spec ── -->
			{#if detail.allStars.length > 0}
				<section class="block" aria-labelledby="allstars-title">
					<header class="block__head" use:reveal>
						<h2 id="allstars-title" class="block__title text-engraved">All-stars por spec</h2>
						<span class="block__rule" aria-hidden="true"></span>
					</header>

					<AllStarsGrid allStars={detail.allStars} wowClass={detail.wowClass} />
				</section>
			{/if}

			<!-- ── Histórico / kills recientes ── -->
			<section class="block" aria-labelledby="historico-title">
				<header class="block__head" use:reveal>
					<h2 id="historico-title" class="block__title text-engraved">Histórico reciente</h2>
					<span class="block__rule" aria-hidden="true"></span>
				</header>

				<RecentKills {recent} playerName={detail.name} />
			</section>
		{:else}
			<!-- ── Estado vacío (sin parses) ── -->
			<div class="empty" use:reveal={{ delay: 60 }}>
				<span class="empty__mark" aria-hidden="true">⚔</span>
				<h1 class="empty__name text-engraved">{name}</h1>
				<p class="empty__title">No encontramos parses de este jugador en SSC/TK todavía.</p>
				<p class="empty__sub">
					Puede que el nombre no esté escrito exactamente igual, que el personaje sea de otro reino,
					o que aún no tenga registros en WarcraftLogs para Caverna del Santuario Serpiente ni
					Tempest Keep.
				</p>
				<a
					class="wcl-btn label-caps"
					href={wclCharacterUrl(name)}
					target="_blank"
					rel="noopener noreferrer"
				>
					Buscar en WarcraftLogs <span class="wcl-btn__arrow" aria-hidden="true">↗</span>
				</a>
			</div>
		{/if}
	</div>
</main>

<style>
	.player {
		position: relative;
		padding: clamp(2.5rem, 6vw, 5rem) 1.25rem clamp(4rem, 9vw, 7rem);
	}
	.player__inner {
		max-width: 60rem;
		margin: 0 auto;
	}

	/* Enlace de vuelta — idioma de core-detail. */
	.player__back {
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
	.player__back:hover {
		color: var(--color-ember);
		transform: translateX(-2px);
	}
	.player__back:focus-visible {
		outline: 2px solid var(--color-lava);
		outline-offset: 3px;
		border-radius: var(--radius-sm);
	}

	/* Botón WarcraftLogs — usado por PlayerHeader (hijo) y el estado vacío, por eso
	   es :global (clase exclusiva de esta página). */
	:global(.wcl-btn) {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-2xs);
		margin-top: var(--spacing-3xl);
		padding: var(--spacing-sm) var(--spacing-xl);
		border-radius: var(--radius-md);
		font-size: var(--text-xs);
		text-decoration: none;
		color: var(--color-silver);
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--color-blood) 50%, transparent),
			color-mix(in srgb, var(--color-crimson-deep) 60%, transparent)
		);
		border: 1px solid color-mix(in srgb, var(--color-lava) 45%, transparent);
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease,
			border-color 0.2s ease;
	}
	:global(.wcl-btn:hover) {
		transform: translateY(-2px);
		border-color: color-mix(in srgb, var(--color-lava) 75%, transparent);
		box-shadow: 0 0 18px rgba(255, 59, 33, 0.4);
	}
	:global(.wcl-btn:focus-visible) {
		outline: 2px solid var(--color-lava);
		outline-offset: 3px;
	}
	:global(.wcl-btn__arrow) {
		font-size: 0.9em;
		transition: transform 0.2s ease;
	}
	:global(.wcl-btn:hover .wcl-btn__arrow) {
		transform: translate(2px, -2px);
	}

	/* ── Bloques (boss / all-stars / histórico) ── */
	.block {
		margin-top: clamp(2.5rem, 5vw, 3.5rem);
	}
	.block__head {
		display: flex;
		align-items: center;
		gap: var(--spacing-xl);
		margin-bottom: var(--spacing-2xl);
	}
	.block__title {
		font-family: var(--font-display);
		font-size: clamp(1.3rem, 4vw, 1.8rem);
		font-weight: 900;
		letter-spacing: var(--tracking-heading);
		text-transform: uppercase;
		margin: 0;
		flex-shrink: 0;
	}
	.block__rule {
		flex: 1;
		height: 1px;
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--color-lava) 55%, transparent),
			transparent
		);
	}

	/* Estado vacío (sin parses) */
	.empty {
		margin-top: var(--spacing-4xl);
		padding: clamp(2.5rem, 6vw, 4rem) clamp(1.5rem, 5vw, 3rem);
		text-align: center;
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--color-stone) 55%, transparent);
		border: 1px dashed color-mix(in srgb, var(--color-steel) 24%, transparent);
	}
	.empty__mark {
		display: block;
		font-size: 2.5rem;
		color: color-mix(in srgb, var(--color-lava) 70%, transparent);
		margin-bottom: var(--spacing-md);
		filter: drop-shadow(0 0 12px rgba(255, 59, 33, 0.4));
	}
	.empty__name {
		font-family: var(--font-display);
		font-size: clamp(1.6rem, 6vw, 2.4rem);
		font-weight: 900;
		letter-spacing: var(--tracking-snug);
		margin: 0 0 var(--spacing-lg);
		word-break: break-word;
	}
	.empty__title {
		font-family: var(--font-display);
		font-size: var(--text-md);
		font-weight: 700;
		color: var(--color-silver);
		margin: 0 0 var(--spacing-md);
	}
	.empty__sub {
		max-width: 38rem;
		margin: 0 auto var(--spacing-3xl);
		font-size: var(--text-sm);
		line-height: 1.6;
		color: var(--color-steel-dim);
	}
	.empty :global(.wcl-btn) {
		margin-top: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.player__back:hover {
			transform: none;
		}
		:global(.wcl-btn:hover),
		:global(.wcl-btn:hover .wcl-btn__arrow) {
			transform: none;
		}
	}
</style>
