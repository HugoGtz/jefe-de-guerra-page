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
		gap: 0.4rem;
		padding: 0.3rem 0.8rem;
		border-radius: 999px;
		background-color: var(--color-stone);
		color: var(--color-silver);
		font-family: var(--font-sans);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.06em;
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
