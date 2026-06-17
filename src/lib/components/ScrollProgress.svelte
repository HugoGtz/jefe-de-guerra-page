<script lang="ts">
	import { scrollProgress } from '$lib/actions/scrollProgress';
</script>

<!-- Barra de progreso de scroll: fija arriba del todo, por encima del navbar. -->
<div class="scroll-progress" aria-hidden="true">
	<div class="scroll-progress__bar" use:scrollProgress></div>
</div>

<style>
	.scroll-progress {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		z-index: 60; /* por encima del navbar (z-index: 50) */
		pointer-events: none;
		background-color: color-mix(in srgb, var(--color-ash) 60%, transparent);
	}
	.scroll-progress__bar {
		height: 100%;
		width: 100%;
		transform: scaleX(0);
		transform-origin: left center;
		background: linear-gradient(
			90deg,
			var(--color-blood),
			var(--color-lava) 55%,
			var(--color-ember)
		);
		box-shadow: 0 0 10px rgba(255, 59, 33, 0.7);
	}

	@media (prefers-reduced-motion: reduce) {
		/* Sin barra de progreso animada: la dejamos discreta y completa. */
		.scroll-progress__bar {
			transform: scaleX(1);
			box-shadow: none;
			opacity: 0.5;
		}
	}
</style>
