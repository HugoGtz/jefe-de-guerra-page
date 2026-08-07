<script lang="ts">
	import { parseTier } from '$lib/parse';

	/**
	 * WCL parse/percentile badge: a high-contrast number tinted by its parse tier
	 * (color only on border/bg/glow). Shared by the player page tables/all-stars/
	 * history and the team roster. `score` drives both the tier color and the
	 * displayed number.
	 */
	let {
		score,
		title,
		ariaLabel,
		size = 'sm',
		class: className = ''
	}: {
		score: number;
		title?: string;
		ariaLabel?: string;
		size?: 'sm' | 'md';
		class?: string;
	} = $props();

	const tier = $derived(parseTier(score));
</script>

<span
	class="parse-badge parse-badge--{size} {className}"
	style="--parse-color: {tier.color}"
	{title}
	aria-label={ariaLabel ?? title}>{score}</span
>

<style>
	.parse-badge {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.2rem;
		border-radius: var(--radius-full);
		font-family: var(--font-display);
		font-weight: 900;
		line-height: 1;
		color: var(--color-silver);
		background: color-mix(in srgb, var(--parse-color) 18%, transparent);
		border: 1px solid color-mix(in srgb, var(--parse-color) 65%, transparent);
		box-shadow: 0 0 10px color-mix(in srgb, var(--parse-color) 28%, transparent);
	}
	.parse-badge--sm {
		padding: 0.16rem var(--spacing-xs);
		font-size: var(--text-sm);
	}
	.parse-badge--md {
		padding: 0.18rem var(--spacing-xs);
		font-size: var(--text-base);
	}
</style>
