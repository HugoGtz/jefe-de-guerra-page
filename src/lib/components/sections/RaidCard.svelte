<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { countUp } from '$lib/actions/countUp';
	import type { Raid } from '$lib/data/raids';

	let { raid }: { raid: Raid } = $props();

	// Reveal state, encapsulated per card: the bar sweeps 0→percent when the card
	// enters the viewport, and bosses light up one-by-one as each reveals.
	let revealed = $state(false);
	let litBosses = $state<Record<string, boolean>>({});
</script>

<div class="raid-card-wrap" use:reveal={{ onreveal: () => (revealed = true) }}>
	<Card beam class="raid-card">
		<header class="raid-card__head">
			<h4 class="raid-card__name text-engraved">
				{raid.name}
				{#if raid.abbr}<span class="raid-card__abbr">{raid.abbr}</span>{/if}
			</h4>
			<span class="raid-card__count"
				><span use:countUp={{ to: raid.kills }}>{raid.kills}</span>/{raid.total}</span
			>
		</header>

		<ProgressBar value={revealed ? raid.percent : 0} />

		<ul class="boss-list">
			{#each raid.bosses as boss, i (boss.name)}
				<li
					class="boss"
					class:is-defeated={boss.defeated}
					class:is-lit={litBosses[boss.name]}
					use:reveal={{
						delay: 120 + i * 90,
						threshold: 0.05,
						onreveal: () => (litBosses[boss.name] = true)
					}}
				>
					<span class="boss__marker" aria-hidden="true"></span>
					<span class="boss__name">{boss.name}</span>
					<span class="boss__status">
						{boss.defeated ? 'Derrotado' : 'Pendiente'}
					</span>
				</li>
			{/each}
		</ul>
	</Card>
</div>

<style>
	.raid-card-wrap {
		display: flex;
	}
	/* La tarjeta es <Card> (provee .surface + padding); solo ajustamos que ocupe
	   todo el ancho del wrapper. La clase llega al root de Card. */
	:global(.raid-card) {
		width: 100%;
	}
	.raid-card__head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--spacing-md);
		margin-bottom: var(--spacing-xl);
	}
	.raid-card__name {
		font-size: var(--text-lg);
		font-weight: 700;
		margin: 0;
		display: flex;
		align-items: baseline;
		gap: var(--spacing-xs);
		flex-wrap: wrap;
	}
	.raid-card__abbr {
		font-size: var(--text-xs);
		font-weight: 700;
		letter-spacing: var(--tracking-caps);
		color: var(--color-ash);
		background-color: var(--color-steel);
		padding: 0.1rem var(--spacing-2xs);
		border-radius: var(--radius-sm);
	}
	.raid-card__count {
		font-family: var(--font-display);
		font-weight: 700;
		color: var(--color-ember);
		white-space: nowrap;
	}

	.boss-list {
		list-style: none;
		margin: var(--spacing-2xl) 0 0;
		padding: 0;
		display: grid;
		gap: var(--spacing-xs);
	}
	.boss {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		font-size: var(--text-sm);
		color: var(--color-steel-dim);
		/* Encendido secuencial: fade + leve slide al entrar (clase .is-lit).
		   El estado oculto NO se aplica por defecto: la acción `reveal` añade
		   `.is-hidden` vía JS, así que sin JS los bosses quedan visibles. */
		transition:
			opacity 0.45s ease,
			transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
	}
	/* Estado oculto solo cuando JS está activo (lo aplica la acción reveal).
	   El will-change vive aquí, así existe únicamente durante la transición de
	   entrada y no deja 12+ capas GPU permanentes en carga. */
	.boss:global(.is-hidden) {
		opacity: 0;
		transform: translateX(-8px);
		will-change: opacity, transform;
	}
	.boss.is-lit {
		opacity: 1;
		transform: translateX(0);
	}
	.boss__marker {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		flex-shrink: 0;
		border: 1px solid color-mix(in srgb, var(--color-steel) 50%, transparent);
		background-color: transparent;
		transition:
			background 0.3s ease,
			box-shadow 0.3s ease;
	}
	.boss.is-defeated .boss__marker {
		background: linear-gradient(135deg, var(--color-lava), var(--color-blood));
		border-color: transparent;
		box-shadow: 0 0 6px rgba(255, 59, 33, 0.5);
	}
	/* Pop/glow del marcador del boss derrotado en el momento de encenderse. */
	.boss.is-defeated.is-lit .boss__marker {
		animation: boss-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
	.boss__name {
		margin-right: auto;
	}
	.boss.is-defeated .boss__name {
		color: var(--color-silver);
	}
	.boss__status {
		font-family: var(--font-display);
		font-size: var(--text-xs);
		letter-spacing: var(--tracking-eyebrow);
		text-transform: uppercase;
	}
	.boss.is-defeated .boss__status {
		color: var(--color-ember);
	}

	@keyframes boss-pop {
		0% {
			transform: scale(0.4);
			box-shadow: 0 0 0 rgba(255, 59, 33, 0);
		}
		55% {
			transform: scale(1.45);
			box-shadow: 0 0 14px rgba(255, 59, 33, 0.85);
		}
		100% {
			transform: scale(1);
			box-shadow: 0 0 6px rgba(255, 59, 33, 0.5);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		/* Sin animación de encendido: bosses siempre visibles y estáticos. */
		.boss {
			opacity: 1;
			transform: none;
			transition: none;
		}
		.boss__marker {
			transition: none;
		}
		.boss.is-defeated.is-lit .boss__marker {
			animation: none;
		}
	}
</style>
