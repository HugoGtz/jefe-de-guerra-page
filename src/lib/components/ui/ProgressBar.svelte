<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = {
		value: number;
		label?: string;
		complete?: boolean;
		class?: string;
	} & Partial<HTMLAttributes<HTMLDivElement>>;

	let { value, label, complete = false, class: className = '', ...rest }: Props = $props();

	/** Clamp to 0–100 so the CSS width is always valid. */
	const clamped = $derived(Math.max(0, Math.min(100, value)));
	const displayValue = $derived(complete ? '100%' : `${Math.round(clamped)}%`);
</script>

<div class="jdg-progress {className}" {...rest}>
	{#if label}
		<div class="jdg-progress__head">
			<span class="jdg-progress__label text-engraved">{label}</span>
			<span class="jdg-progress__value" class:is-complete={complete}>{displayValue}</span>
		</div>
	{/if}

	<div
		class="jdg-progress__track metal-border"
		role="progressbar"
		aria-valuenow={clamped}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label={label}
	>
		<div
			class="jdg-progress__fill"
			class:is-complete={complete}
			style="--progress: {clamped}%"
		>
			<!-- Continuous shine sweep, clipped to the filled portion (the fill
			     itself is overflow:hidden). Pure translateX of a highlight band. -->
			<span class="jdg-progress__shine" aria-hidden="true"></span>
		</div>
	</div>
</div>

<style>
	.jdg-progress {
		width: 100%;
	}

	.jdg-progress__head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 0.4rem;
		font-family: var(--font-display);
	}
	.jdg-progress__label {
		font-size: 0.95rem;
		font-weight: 600;
		letter-spacing: 0.03em;
	}
	.jdg-progress__value {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--color-steel);
	}
	.jdg-progress__value.is-complete {
		color: var(--color-ember);
		text-shadow: 0 0 8px rgba(255, 107, 44, 0.5);
	}

	.jdg-progress__track {
		position: relative;
		height: 0.75rem;
		width: 100%;
		border-radius: 999px;
		background-color: var(--color-stone);
		overflow: hidden;
	}

	.jdg-progress__fill {
		position: relative;
		height: 100%;
		/* Driven by --progress so a parent/scroll action can flip it from
		   0% to the real value on enter; animates via width transition. */
		width: var(--progress, 0%);
		border-radius: 999px;
		/* Clip the shine band to the filled portion only. */
		overflow: hidden;
		background: linear-gradient(
			90deg,
			var(--color-crimson-deep),
			var(--color-blood) 55%,
			var(--color-lava)
		);
		box-shadow: 0 0 10px rgba(255, 59, 33, 0.4);
		transition: width 1.1s cubic-bezier(0.22, 1, 0.36, 1);
	}

	/* Slow continuous left -> right shine across the filled portion. Lives on
	   its own layer (translateX only) so it never fights the width transition. */
	.jdg-progress__shine {
		position: absolute;
		top: 0;
		left: 0;
		width: 40%;
		height: 100%;
		pointer-events: none;
		background: linear-gradient(
			100deg,
			transparent 0%,
			rgba(229, 229, 229, 0.18) 45%,
			rgba(255, 255, 255, 0.35) 50%,
			rgba(229, 229, 229, 0.18) 55%,
			transparent 100%
		);
		transform: translateX(-120%);
		animation: jdg-shine-sweep 3.2s ease-in-out infinite;
		will-change: transform;
	}

	/* Complete: brighter golden-red sheen + gentle pulsing glow. */
	.jdg-progress__fill.is-complete {
		background: linear-gradient(
			90deg,
			var(--color-blood),
			var(--color-lava) 50%,
			var(--color-ember)
		);
		box-shadow:
			0 0 14px rgba(255, 107, 44, 0.6),
			inset 0 0 8px rgba(255, 229, 180, 0.25);
		animation: jdg-complete-glow 2.4s ease-in-out infinite;
	}

	/* Reduced motion: jump straight to final width, no animation. The global
	   rule near-zeroes the shine/glow durations; force-hide the shine band so
	   no stray highlight lingers, and keep the bar fully visible/usable. */
	@media (prefers-reduced-motion: reduce) {
		.jdg-progress__fill {
			transition: none;
		}
		.jdg-progress__shine {
			display: none;
		}
	}
</style>
