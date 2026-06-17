<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Props = {
		variant?: 'primary' | 'ghost';
		href?: string;
		/** Subtle continuous attention pulse (used for the main Discord CTA). */
		pulse?: boolean;
		/** Continuous light beam traveling around the border (main CTA). */
		beam?: boolean;
		class?: string;
		children?: Snippet;
	} & Partial<HTMLAnchorAttributes & HTMLButtonAttributes>;

	let {
		variant = 'primary',
		href,
		pulse = false,
		beam = false,
		class: className = '',
		children,
		...rest
	}: Props = $props();
</script>

{#if href}
	<a
		{href}
		class="jdg-btn jdg-gleam jdg-btn--{variant} {className}"
		class:jdg-btn--pulse={pulse}
		class:jdg-beam={beam}
		{...rest}
	>
		<span class="jdg-btn__label">{@render children?.()}</span>
	</a>
{:else}
	<button
		class="jdg-btn jdg-gleam jdg-btn--{variant} {className}"
		class:jdg-btn--pulse={pulse}
		class:jdg-beam={beam}
		{...rest}
	>
		<span class="jdg-btn__label">{@render children?.()}</span>
	</button>
{/if}

<style>
	.jdg-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.7rem 1.5rem;
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 0.95rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		line-height: 1;
		border-radius: 2px;
		cursor: pointer;
		user-select: none;
		text-decoration: none;
		border: 1px solid transparent;
		transition:
			transform 0.2s ease,
			box-shadow 0.25s ease,
			border-color 0.25s ease,
			background-color 0.25s ease,
			color 0.25s ease;
	}

	.jdg-btn:focus-visible {
		outline: 2px solid var(--color-lava);
		outline-offset: 2px;
	}

	/* Keep the label (and any icon) above the gleam ::before and the beam
	   ::after ring. Mirrors the button's own inline-flex + gap so multi-child
	   content (icon + text) keeps its spacing. */
	.jdg-btn__label {
		position: relative;
		z-index: 1;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	/* Subtle continuous attention pulse (opt-in via `pulse` prop).
	   Uses the shared jdg-pulse keyframes (transform + box-shadow only).
	   The breathing keyframes already include the -2px lift, so the
	   button reads as gently "alive" at rest. */
	.jdg-btn--pulse {
		animation: jdg-pulse 2s ease-in-out infinite;
		will-change: transform;
	}

	/* Primary: blood bg, silver text, metal border */
	.jdg-btn--primary {
		background-color: var(--color-blood);
		color: var(--color-silver);
		border-color: color-mix(in srgb, var(--color-steel) 40%, transparent);
		box-shadow:
			inset 0 1px 0 rgba(229, 229, 229, 0.12),
			0 2px 6px rgba(0, 0, 0, 0.5);
	}
	.jdg-btn--primary:hover {
		transform: translateY(-2px);
		border-color: color-mix(in srgb, var(--color-steel) 75%, transparent);
		box-shadow:
			inset 0 1px 0 rgba(229, 229, 229, 0.18),
			0 0 16px rgba(255, 59, 33, 0.45),
			0 0 32px rgba(161, 6, 19, 0.35);
	}

	/* Ghost: transparent w/ steel border, fills toward blood on hover */
	.jdg-btn--ghost {
		background-color: transparent;
		color: var(--color-silver);
		border-color: color-mix(in srgb, var(--color-steel) 45%, transparent);
	}
	.jdg-btn--ghost:hover {
		transform: translateY(-2px);
		background-color: color-mix(in srgb, var(--color-blood) 85%, transparent);
		border-color: color-mix(in srgb, var(--color-steel) 75%, transparent);
		box-shadow: 0 0 16px rgba(255, 59, 33, 0.35);
	}

	@media (prefers-reduced-motion: reduce) {
		.jdg-btn:hover {
			transform: none;
		}
	}
</style>
