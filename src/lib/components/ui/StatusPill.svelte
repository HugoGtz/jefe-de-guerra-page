<script lang="ts">
	/**
	 * Recruitment status pill (Reclutando / Cerrado). Shared by the Teams grid and
	 * the team detail page. When open, a lava dot pulses (unless the user prefers
	 * reduced motion).
	 */
	import { pauseOffscreen } from '$lib/actions/pauseOffscreen';

	let { open }: { open: boolean } = $props();
</script>

<span class="pill label-caps" class:pill--open={open} class:pill--closed={!open} use:pauseOffscreen>
	{open ? 'Reclutando' : 'Cerrado'}
</span>

<style>
	.pill {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-2xs);
		padding: 0.28rem var(--spacing-md);
		border-radius: var(--radius-full);
		font-size: var(--text-2xs);
		white-space: nowrap;
		border: 1px solid transparent;
	}
	.pill--open {
		color: var(--color-silver);
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--color-blood) 45%, transparent),
			color-mix(in srgb, var(--color-lava) 30%, transparent)
		);
		border-color: color-mix(in srgb, var(--color-lava) 60%, transparent);
		box-shadow: 0 0 12px rgba(255, 59, 33, 0.35);
	}
	.pill--open::before {
		content: '';
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background-color: var(--color-lava);
		box-shadow: 0 0 8px rgba(255, 59, 33, 0.8);
		animation: pill-blink 1.8s ease-in-out infinite;
	}
	.pill--closed {
		color: var(--color-steel-dim);
		background-color: color-mix(in srgb, var(--color-steel) 12%, transparent);
		border-color: color-mix(in srgb, var(--color-steel) 24%, transparent);
	}

	@keyframes pill-blink {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.4;
			transform: scale(0.78);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pill--open::before {
			animation: none;
		}
	}
</style>
