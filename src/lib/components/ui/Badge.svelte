<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = {
		class?: string;
		children?: Snippet;
	} & Partial<HTMLAttributes<HTMLSpanElement>>;

	let { class: className = '', children, ...rest }: Props = $props();
</script>

<span class="jdg-badge metal-border {className}" {...rest}>
	{@render children?.()}
</span>

<style>
	.jdg-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-2xs);
		padding: var(--spacing-3xs) var(--spacing-md);
		border-radius: var(--radius-full);
		background-color: var(--color-stone);
		color: var(--color-silver);
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		white-space: nowrap;
		transition:
			filter 0.25s ease,
			box-shadow 0.25s ease;
	}

	/* Very subtle hover lift: brighten + faint red glow. transform/filter/
	   box-shadow only, so it stays 60fps and degrades under reduced motion. */
	.jdg-badge:hover {
		filter: brightness(1.12);
		box-shadow: 0 0 10px rgba(255, 59, 33, 0.25);
	}
</style>
