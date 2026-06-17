<script lang="ts">
	import { onMount } from 'svelte';
	import { getReducedMotion } from '$lib/utils/reducedMotion';

	// Resplandor rojo ambiental que sigue al cursor con suavizado (lerp).
	// Solo transform (translate3d) + opacidad. Desactivado en táctil y bajo
	// reduced-motion. Limpia el rAF y los listeners al destruirse.
	let glowEl = $state<HTMLDivElement>();

	onMount(() => {
		const finePointer =
			typeof window.matchMedia === 'function' &&
			window.matchMedia('(hover: hover) and (pointer: fine)').matches;

		if (getReducedMotion() || !finePointer || !glowEl) return;

		const el = glowEl;
		// Posición objetivo (cursor) y posición actual (suavizada).
		let targetX = window.innerWidth / 2;
		let targetY = window.innerHeight / 2;
		let currentX = targetX;
		let currentY = targetY;
		let rafId = 0;
		let visible = false;

		const onMove = (e: PointerEvent) => {
			if (e.pointerType !== 'mouse') return;
			targetX = e.clientX;
			targetY = e.clientY;
			if (!visible) {
				visible = true;
				el.style.opacity = '1';
			}
		};

		const onLeave = () => {
			visible = false;
			el.style.opacity = '0';
		};

		const tick = () => {
			// Lerp suave hacia el objetivo.
			currentX += (targetX - currentX) * 0.12;
			currentY += (targetY - currentY) * 0.12;
			el.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
			rafId = requestAnimationFrame(tick);
		};

		window.addEventListener('pointermove', onMove, { passive: true });
		document.addEventListener('pointerleave', onLeave, { passive: true });
		rafId = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(rafId);
			window.removeEventListener('pointermove', onMove);
			document.removeEventListener('pointerleave', onLeave);
		};
	});
</script>

<div bind:this={glowEl} class="cursor-glow" aria-hidden="true"></div>

<style>
	.cursor-glow {
		position: fixed;
		top: 0;
		left: 0;
		/* Sobre la atmósfera (z:-1) pero por detrás del contenido. */
		z-index: 0;
		width: 520px;
		height: 520px;
		border-radius: 50%;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.5s ease;
		background: radial-gradient(
			circle,
			rgba(255, 59, 33, 0.1),
			rgba(161, 6, 19, 0.06) 40%,
			transparent 70%
		);
		filter: blur(12px);
		will-change: transform, opacity;
	}

	@media (prefers-reduced-motion: reduce) {
		.cursor-glow {
			display: none;
		}
	}
</style>
