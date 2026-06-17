<script lang="ts">
	import { onDestroy } from 'svelte';

	type Props = {
		/** Text copied to the clipboard. */
		value: string;
		/** Resting label (default: "Copiar"). */
		label?: string;
		class?: string;
	};

	let { value, label = 'Copiar', class: className = '' }: Props = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	// SSR-safe / no-clipboard guard: only enable when the API is reachable.
	function canCopy(): boolean {
		return (
			typeof navigator !== 'undefined' &&
			!!navigator.clipboard &&
			typeof navigator.clipboard.writeText === 'function'
		);
	}

	async function copy() {
		if (!canCopy()) return;
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 1800);
		} catch {
			// Silently ignore (permission denied / insecure context); button stays usable.
		}
	}

	onDestroy(() => clearTimeout(timer));
</script>

<button
	type="button"
	class="copy-btn {className}"
	class:copy-btn--done={copied}
	onclick={copy}
	aria-label={copied ? '¡Copiado!' : `${label}: ${value}`}
>
	<span class="copy-btn__icon" aria-hidden="true">
		{#if copied}
			<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
				<path d="M20 6 9 17l-5-5" />
			</svg>
		{:else}
			<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
				<rect x="9" y="9" width="11" height="11" rx="2" />
				<path d="M5 15V5a2 2 0 0 1 2-2h10" />
			</svg>
		{/if}
	</span>
	<span class="copy-btn__label">{copied ? '¡Copiado!' : label}</span>
</button>

<!-- Live region announces the transient feedback to assistive tech. -->
<span class="sr-only" aria-live="polite">{copied ? 'Enlace copiado al portapapeles' : ''}</span>

<style>
	.copy-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.4rem 0.85rem;
		font-family: var(--font-display);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		line-height: 1;
		color: var(--color-steel);
		background-color: color-mix(in srgb, var(--color-stone) 70%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-steel) 28%, transparent);
		border-radius: 3px;
		cursor: pointer;
		transition:
			transform 0.2s ease,
			color 0.25s ease,
			border-color 0.25s ease,
			box-shadow 0.25s ease;
	}
	.copy-btn:hover {
		transform: translateY(-1px);
		color: var(--color-silver);
		border-color: color-mix(in srgb, var(--color-lava) 55%, transparent);
		box-shadow: 0 0 12px rgba(255, 59, 33, 0.3);
	}
	.copy-btn:focus-visible {
		outline: 2px solid var(--color-lava);
		outline-offset: 2px;
	}
	.copy-btn--done,
	.copy-btn--done:hover {
		color: var(--color-ember);
		border-color: color-mix(in srgb, var(--color-ember) 65%, transparent);
	}
	.copy-btn__icon {
		display: inline-flex;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.copy-btn:hover {
			transform: none;
		}
	}
</style>
