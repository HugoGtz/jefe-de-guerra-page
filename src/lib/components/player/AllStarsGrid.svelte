<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import ParseBadge from '$lib/components/ui/ParseBadge.svelte';
	import ClassSpecIcon from '$lib/components/ui/ClassSpecIcon.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { parseTier } from '$lib/parse';
	import { specOrClassIcon } from '$lib/wow-icons';
	import { rankText } from '$lib/playerFormat';

	type AllStar = {
		spec: string;
		rankPercent: number | null;
		points: number;
		possiblePoints: number;
		server: number | null;
		region: number | null;
		world: number | null;
	};

	let {
		allStars,
		wowClass
	}: { allStars: AllStar[]; wowClass: string | number | null | undefined } = $props();
</script>

<div class="allstars">
	{#each allStars as as_, i (as_.spec)}
		{@const tier = as_.rankPercent != null ? parseTier(as_.rankPercent) : null}
		{@const specIcon = specOrClassIcon(wowClass, as_.spec)}
		<div use:reveal={{ delay: Math.min(i * 80, 320), blur: true }}>
			<Card class="allstar-card">
				<div class="allstar__head">
					{#if specIcon}
						<ClassSpecIcon src={specIcon} size={32} class="allstar__icon" />
					{/if}
					<span class="allstar__spec">{as_.spec}</span>
					{#if as_.rankPercent != null && tier}
						<ParseBadge
							score={as_.rankPercent}
							title={`Percentil ${as_.rankPercent} · ${tier.label}`}
							ariaLabel={`Percentil ${as_.rankPercent}, ${tier.label}`}
						/>
					{/if}
				</div>
				<p class="allstar__points">
					<strong>{as_.points.toLocaleString('es-ES')}</strong>
					<span class="allstar__points-of">/ {as_.possiblePoints.toLocaleString('es-ES')} pts</span>
				</p>
				<dl class="allstar__ranks">
					<div>
						<dt>Servidor</dt>
						<dd>{rankText(as_.server)}</dd>
					</div>
					<div>
						<dt>Región</dt>
						<dd>{rankText(as_.region)}</dd>
					</div>
					<div>
						<dt>Mundo</dt>
						<dd>{rankText(as_.world)}</dd>
					</div>
				</dl>
			</Card>
		</div>
	{/each}
</div>

<style>
	.allstars {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--spacing-xl);
	}
	:global(.allstar-card) {
		height: 100%;
		padding: var(--spacing-xl) var(--spacing-2xl);
	}
	.allstar__head {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-md);
	}
	/* :global — estiliza el <img> de ClassSpecIcon (componente hijo). */
	:global(.allstar__icon) {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-md);
		object-fit: cover;
		border: 1px solid color-mix(in srgb, var(--color-steel) 30%, transparent);
	}
	.allstar__spec {
		font-family: var(--font-display);
		font-size: var(--text-md);
		font-weight: 700;
		letter-spacing: var(--tracking-snug);
		color: var(--color-silver);
		flex: 1;
		min-width: 0;
	}
	.allstar__points {
		margin: 0 0 var(--spacing-lg);
		color: var(--color-steel-dim);
		font-size: var(--text-sm);
	}
	.allstar__points strong {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-weight: 900;
		color: var(--color-ember);
	}
	.allstar__points-of {
		margin-left: var(--spacing-3xs);
	}
	.allstar__ranks {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--spacing-xs);
		margin: 0;
	}
	.allstar__ranks div {
		text-align: center;
		padding: var(--spacing-xs) var(--spacing-3xs);
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--color-ash) 45%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-steel) 12%, transparent);
	}
	.allstar__ranks dt {
		font-size: var(--text-2xs);
		font-weight: 700;
		letter-spacing: var(--tracking-eyebrow);
		text-transform: uppercase;
		color: var(--color-steel-dim);
	}
	.allstar__ranks dd {
		margin: var(--spacing-3xs) 0 0;
		font-family: var(--font-display);
		font-size: var(--text-base);
		font-weight: 900;
		color: var(--color-silver);
	}

	@media (min-width: 600px) {
		.allstars {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (min-width: 1024px) {
		.allstars {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>
