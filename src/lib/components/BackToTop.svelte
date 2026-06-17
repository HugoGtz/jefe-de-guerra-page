<script lang="ts">
	import { onMount } from 'svelte';
	import { getReducedMotion } from '$lib/utils/reducedMotion';

	const SHOW_AFTER = 600;

	let visible = $state(false);

	onMount(() => {
		let ticking = false;

		const evaluate = () => {
			ticking = false;
			visible = window.scrollY > SHOW_AFTER;
		};

		const onScroll = () => {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(evaluate);
		};

		// Initial state (e.g. when navigating back to a scrolled position).
		evaluate();
		window.addEventListener('scroll', onScroll, { passive: true });

		return () => window.removeEventListener('scroll', onScroll);
	});

	function toTop() {
		window.scrollTo({ top: 0, behavior: getReducedMotion() ? 'auto' : 'smooth' });
	}
</script>

<button
	type="button"
	class="back-to-top"
	class:is-visible={visible}
	onclick={toTop}
	aria-label="Volver arriba"
	tabindex={visible ? 0 : -1}
>
	<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="m6 15 6-6 6 6" />
	</svg>
</button>

<style>
	.back-to-top {
		position: fixed;
		right: max(1.25rem, env(safe-area-inset-right));
		bottom: max(1.25rem, env(safe-area-inset-bottom));
		z-index: 40;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		color: var(--color-steel);
		background: linear-gradient(
			145deg,
			color-mix(in srgb, var(--color-iron) 92%, transparent),
			color-mix(in srgb, var(--color-ash) 88%, transparent)
		);
		border: 1px solid color-mix(in srgb, var(--color-steel) 32%, transparent);
		box-shadow:
			inset 0 1px 0 rgba(229, 229, 229, 0.1),
			0 4px 14px rgba(0, 0, 0, 0.55);
		cursor: pointer;
		/* Hidden + non-interactive until revealed. */
		opacity: 0;
		transform: translateY(14px) scale(0.85);
		pointer-events: none;
		transition:
			opacity 0.3s ease,
			transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
			color 0.25s ease,
			border-color 0.25s ease,
			box-shadow 0.25s ease;
	}
	.back-to-top.is-visible {
		opacity: 1;
		transform: translateY(0) scale(1);
		pointer-events: auto;
	}
	.back-to-top:hover {
		color: var(--color-silver);
		border-color: color-mix(in srgb, var(--color-lava) 60%, transparent);
		box-shadow:
			inset 0 1px 0 rgba(229, 229, 229, 0.15),
			0 0 16px rgba(255, 59, 33, 0.45),
			0 4px 18px rgba(0, 0, 0, 0.55);
	}
	.back-to-top.is-visible:hover {
		transform: translateY(-2px) scale(1);
	}
	.back-to-top:focus-visible {
		outline: 2px solid var(--color-lava);
		outline-offset: 3px;
	}

	@media (prefers-reduced-motion: reduce) {
		.back-to-top {
			transition: opacity 0.2s ease;
			transform: none;
		}
		.back-to-top.is-visible,
		.back-to-top.is-visible:hover {
			transform: none;
		}
	}
</style>
