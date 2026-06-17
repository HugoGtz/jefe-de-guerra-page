<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = {
		/** Continuous light beam traveling around the border (raid cards). */
		beam?: boolean;
		class?: string;
		children?: Snippet;
	} & Partial<HTMLAttributes<HTMLDivElement>>;

	let { beam = false, class: className = '', children, ...rest }: Props = $props();

	let cardEl = $state<HTMLDivElement>();
	let hovered = $state(false);
	/** Whether the device is fine-pointer (mouse) — gated so touch never
	    triggers the spotlight, which would feel laggy / stick on tap. */
	let finePointer = $state(true);

	/** rAF-throttled pointer tracking: store the latest event, apply once
	    per frame so we never thrash the layout/paint on rapid moves. */
	let rafId = 0;
	let pendingX = 0;
	let pendingY = 0;

	function applySpotlight() {
		rafId = 0;
		if (!cardEl) return;
		const rect = cardEl.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;
		const mx = ((pendingX - rect.left) / rect.width) * 100;
		const my = ((pendingY - rect.top) / rect.height) * 100;
		cardEl.style.setProperty('--mx', `${mx}%`);
		cardEl.style.setProperty('--my', `${my}%`);
	}

	function handleMouseMove(event: MouseEvent) {
		if (!finePointer) return;
		pendingX = event.clientX;
		pendingY = event.clientY;
		if (rafId === 0) rafId = requestAnimationFrame(applySpotlight);
	}

	function handlePointerDown(event: PointerEvent) {
		// Coarse (touch / pen) pointers disable the spotlight entirely.
		finePointer = event.pointerType === 'mouse';
		if (!finePointer) hovered = false;
	}

	$effect(() => {
		// Clean up any in-flight rAF when the component is destroyed.
		return () => {
			if (rafId !== 0) cancelAnimationFrame(rafId);
		};
	});
</script>

<div
	bind:this={cardEl}
	class="jdg-card surface {className}"
	class:jdg-beam={beam}
	class:is-spotlit={hovered && finePointer}
	onmousemove={handleMouseMove}
	onmouseenter={() => (hovered = true)}
	onmouseleave={() => (hovered = false)}
	onpointerdown={handlePointerDown}
	{...rest}
>
	<!-- Cursor spotlight — its own inner absolutely-positioned layer so it
	     never fights a tilt action's `transform` on the root. -->
	<span class="jdg-card__spotlight" aria-hidden="true"></span>
	<!-- Sheen lives on a dedicated inner layer so a tilt action setting
	     `transform` on the root never fights the sweep animation. -->
	<span class="jdg-card__sheen" aria-hidden="true"></span>
	<div class="jdg-card__content">
		{@render children?.()}
	</div>
</div>

<style>
	.jdg-card {
		position: relative;
		/* Clip the sheen band to the card's rounded bounds. */
		overflow: hidden;
		border-radius: 4px;
		padding: 1.5rem;
		transition:
			transform 0.25s ease,
			box-shadow 0.3s ease,
			border-color 0.3s ease;
	}
	.jdg-card:hover {
		transform: translateY(-4px);
		border-color: color-mix(in srgb, var(--color-steel) 65%, transparent);
		box-shadow:
			inset 0 1px 0 rgba(229, 229, 229, 0.08),
			0 6px 18px rgba(0, 0, 0, 0.6),
			0 0 18px rgba(255, 59, 33, 0.22);
	}

	/* Keep content above the sheen + spotlight layers. */
	.jdg-card__content {
		position: relative;
		z-index: 1;
	}

	/* Cursor spotlight — soft radial highlight following the pointer.
	   Position driven purely by the --mx/--my CSS vars (set via rAF in JS);
	   only `opacity` transitions, so it stays cheap. Defaults to centre so
	   the very first frame after enter isn't jarring. */
	.jdg-card__spotlight {
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		opacity: 0;
		background: radial-gradient(
			circle at var(--mx, 50%) var(--my, 50%),
			rgba(255, 59, 33, 0.16),
			transparent 45%
		);
		transition: opacity 0.25s ease;
	}
	.jdg-card.is-spotlit .jdg-card__spotlight {
		opacity: 1;
	}

	/* Metallic sheen band — its own absolutely-positioned layer so the
	   root's transform (potentially driven by a tilt action) is free.
	   Animated purely via translateX + opacity. */
	.jdg-card__sheen {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 0;
		width: 55%;
		height: 100%;
		pointer-events: none;
		background: linear-gradient(
			105deg,
			transparent 0%,
			rgba(184, 188, 194, 0.1) 42%,
			rgba(229, 229, 229, 0.22) 50%,
			rgba(184, 188, 194, 0.1) 58%,
			transparent 100%
		);
		transform: translateX(-180%) skewX(-16deg);
		opacity: 0;
		transition:
			transform 0s,
			opacity 0.25s ease;
	}
	.jdg-card:hover .jdg-card__sheen {
		opacity: 1;
		transform: translateX(320%) skewX(-16deg);
		transition:
			transform 0.85s ease,
			opacity 0.25s ease;
	}

	@media (prefers-reduced-motion: reduce) {
		.jdg-card:hover {
			transform: none;
		}
		/* No moving spotlight under reduced motion — keep it hidden so no
		   pointer-driven highlight appears. Card stays fully legible. */
		.jdg-card__spotlight {
			display: none;
		}
	}
</style>
