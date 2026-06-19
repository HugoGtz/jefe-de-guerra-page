<script lang="ts">
	import { onMount } from 'svelte';
	import { prefersReducedMotion } from '$lib/utils/reducedMotion';

	// The dark "forge + lava glow" atmosphere is pure CSS (always rendered,
	// GPU-safe). The transparent WebGL canvas on top carries only the floating
	// ember particles. See EmberScene.ts for why the background is not a shader.
	let canvasEl = $state<HTMLCanvasElement | undefined>(undefined);
	let mounted = $state(false);
	let scene: import('$lib/three/EmberScene').EmberScene | null = null;

	// Live reduced-motion preference. SSR-safe (the store defaults to false on the
	// server) and updates reactively if the OS setting is toggled while open.
	// `$`-auto-subscription gives us a reactive boolean.
	const reducedMotion = $derived($prefersReducedMotion);

	onMount(() => {
		mounted = true;
	});

	// Runs (client-only) once the <canvas> is in the DOM. Dynamically imports
	// three.js so it never touches the SSR/prerender bundle. The scene is created
	// once; its loop is started/stopped reactively below.
	$effect(() => {
		if (!canvasEl) return;

		let cancelled = false;
		import('$lib/three/EmberScene').then(({ EmberScene }) => {
			if (cancelled || !canvasEl) return;
			scene = new EmberScene(canvasEl);
			// Start only if motion is currently allowed; the effect below keeps it
			// in sync from here on.
			if (!reducedMotion) scene.start();
		});

		return () => {
			cancelled = true;
			scene?.dispose();
			scene = null;
		};
	});

	// React to live reduced-motion changes: pause/resume the ember loop. The
	// atmosphere's still state is handled by the class binding in the template.
	$effect(() => {
		if (reducedMotion) {
			scene?.stop();
		} else {
			scene?.start();
		}
	});
</script>

<!--
	Atmosphere: layered CSS radial-gradient glows at different screen positions,
	each animating on independent transform/opacity timelines.
	No WebGL fragment shader, no per-pixel procedural math — just CSS.
	Pure CSS → no GPU fragment-shader artifacts, smooth on every device.
-->
<div class="atmosphere" class:atmosphere--still={reducedMotion} aria-hidden="true">
	<!-- Main forge glow — bottom-weighted, the primary heat source -->
	<div class="glow glow--forge"></div>
	<!-- Secondary ember column — rises from lower-left, slow drift -->
	<div class="glow glow--left"></div>
	<!-- Right shoulder glow — ambient warmth from the right -->
	<div class="glow glow--right"></div>
	<!-- Top vignette — keeps heading text on dark ground -->
	<div class="glow glow--top-vignette"></div>
	<!-- Fog/smoke layer — large, very blurred, drifts slowly across -->
	<div class="fog fog--a"></div>
	<div class="fog fog--b"></div>
</div>

{#if mounted && !reducedMotion}
	<canvas bind:this={canvasEl} class="embers" aria-hidden="true"></canvas>
{/if}

<style>
	/* -------------------------------------------------------------------------
	 * Base atmosphere shell — the dark forge night sky.
	 * All child divs are absolute and animate transform/opacity only (no layout).
	 * ------------------------------------------------------------------------- */
	.atmosphere {
		position: fixed;
		inset: 0;
		z-index: -2;
		pointer-events: none;
		/* Base dark ash + broad ambient warmth from below. These are static and
		   never animated — only the child pseudo-elements/divs breathe. */
		background:
			radial-gradient(ellipse 140% 90% at 50% 130%, rgba(161, 6, 19, 0.32) 0%, transparent 58%),
			radial-gradient(ellipse 80% 60% at 18% 15%, rgba(107, 4, 16, 0.16) 0%, transparent 60%),
			radial-gradient(ellipse 70% 55% at 85% 20%, rgba(107, 4, 16, 0.14) 0%, transparent 60%),
			radial-gradient(ellipse 130% 110% at 50% 0%, rgba(18, 14, 13, 0.6) 0%, transparent 65%),
			#0a0708;
		/* contain children so overflow doesn't scroll the page */
		overflow: hidden;
	}

	/* -------------------------------------------------------------------------
	 * Glow divs — each absolutely positioned, radial-gradient warmth.
	 * NOTE: NO `will-change` here. Promoting these gradient divs to their own
	 * compositor layer makes the ANGLE/Metal GPU path render the layer's hard
	 * RECTANGULAR bounding box (a faint square in the glow, visible on scroll) —
	 * the same class of Metal tiling artifact as the old procedural shader. The
	 * slow transform breathe/drift still composites fine without the hint.
	 * ------------------------------------------------------------------------- */
	.glow {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
	}

	/* Main forge glow — large ellipse sitting below the viewport bottom edge,
	   pulsing upward. Primary heat source, drives the "forge" feeling. */
	.glow--forge {
		width: 160%;
		height: 90vh;
		left: -30%;
		bottom: -45vh;
		background: radial-gradient(
			ellipse 100% 100% at 50% 100%,
			rgba(255, 59, 33, 0.26) 0%,
			rgba(161, 6, 19, 0.18) 35%,
			transparent 70%
		);
		opacity: 0.85;
	}

	/* Left-side ember column — shifts slightly horizontally with a different period */
	.glow--left {
		width: 80%;
		height: 80vh;
		left: -20%;
		bottom: -30vh;
		background: radial-gradient(
			ellipse 80% 100% at 30% 90%,
			rgba(255, 107, 44, 0.14) 0%,
			rgba(161, 6, 19, 0.10) 45%,
			transparent 70%
		);
		opacity: 0.7;
	}

	/* Right shoulder ambient glow — opposite phase to left for visual rhythm */
	.glow--right {
		width: 75%;
		height: 70vh;
		right: -18%;
		bottom: -20vh;
		background: radial-gradient(
			ellipse 80% 100% at 70% 90%,
			rgba(255, 59, 33, 0.12) 0%,
			rgba(107, 4, 16, 0.08) 45%,
			transparent 70%
		);
		opacity: 0.6;
	}

	/* Top dark vignette — keeps text readable, never animates brightness upward */
	.glow--top-vignette {
		width: 100%;
		height: 55vh;
		left: 0;
		top: 0;
		background: radial-gradient(
			ellipse 100% 100% at 50% 0%,
			rgba(10, 7, 8, 0.65) 0%,
			transparent 70%
		);
		/* Subtle slow scale so it doesn't look completely frozen */
		opacity: 0.95;
	}

	/* -------------------------------------------------------------------------
	 * Fog/smoke layers — huge, blurred-looking, very low opacity, slow drift.
	 * Implemented as large radial-gradient blobs that translate across the scene.
	 * filter: blur() would be costly; the gradient soft-edge fakes the blur.
	 * ------------------------------------------------------------------------- */
	.fog {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
		/* No `will-change` — see the .glow note (avoids the Metal rectangular
		   layer artifact). The drift animation still composites without it. */
	}

	/* Fog blob A — drifts from lower-left toward center-right */
	.fog--a {
		width: 130%;
		height: 70vh;
		left: -40%;
		bottom: 5vh;
		background: radial-gradient(
			ellipse 100% 100% at 40% 70%,
			rgba(60, 15, 10, 0.18) 0%,
			rgba(40, 10, 8, 0.08) 50%,
			transparent 80%
		);
		opacity: 0.55;
	}

	/* Fog blob B — starts center-right, slower, creates layered depth */
	.fog--b {
		width: 120%;
		height: 60vh;
		right: -35%;
		bottom: 10vh;
		background: radial-gradient(
			ellipse 100% 100% at 60% 60%,
			rgba(50, 12, 8, 0.15) 0%,
			rgba(30, 8, 6, 0.06) 50%,
			transparent 80%
		);
		opacity: 0.45;
	}

	/* -------------------------------------------------------------------------
	 * NOTE: the glow/fog divs are STATIC (no per-element transform/opacity
	 * animation). An infinite transform animation keeps each div on its own
	 * compositor layer, and the ANGLE/Metal GPU path then renders that layer's
	 * hard RECTANGULAR bounding box (a faint square in the glow, visible while
	 * scrolling) — the same Metal tiling artifact as the old procedural shader.
	 * Static gradients paint into the single fixed `.atmosphere` layer (viewport
	 * sized → no sub-rectangle). Motion/life comes from the ember canvas instead.
	 * Do NOT reintroduce keyframe animations or `will-change` on these divs.
	 * ------------------------------------------------------------------------- */

	/* -------------------------------------------------------------------------
	 * Reduced motion: the atmosphere is already static; nothing extra to drop.
	 * ------------------------------------------------------------------------- */
	@media (prefers-reduced-motion: reduce) {
		.glow,
		.fog {
			animation: none !important;
		}
		/* Settle each layer at a nice resting state */
		.glow--forge    { opacity: 0.85; }
		.glow--left     { opacity: 0.7;  }
		.glow--right    { opacity: 0.6;  }
		.glow--top-vignette { opacity: 0.95; }
		.fog--a         { opacity: 0.55; }
		.fog--b         { opacity: 0.45; }
	}

	/* JS-driven reduced-motion class (mirrors the CSS media query above) */
	.atmosphere--still .glow,
	.atmosphere--still .fog {
		animation: none !important;
	}
	.atmosphere--still .glow--forge    { opacity: 0.85; }
	.atmosphere--still .glow--left     { opacity: 0.7;  }
	.atmosphere--still .glow--right    { opacity: 0.6;  }
	.atmosphere--still .glow--top-vignette { opacity: 0.95; }
	.atmosphere--still .fog--a         { opacity: 0.55; }
	.atmosphere--still .fog--b         { opacity: 0.45; }

	/* -------------------------------------------------------------------------
	 * Canvas overlay — transparent, particles only.
	 * ------------------------------------------------------------------------- */
	.embers {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		z-index: -1;
		pointer-events: none;
		display: block;
	}
</style>
