<script lang="ts">
	// Divisor: fina grieta horizontal roja brillante con un flujo lento.
	// Decorativo. Animado solo con transform + opacidad (gradiente que se
	// desplaza). Se detiene bajo prefers-reduced-motion (regla CSS global +
	// local). No provoca reflow: tiene altura fija reservada.
</script>

<div class="lava-divider" aria-hidden="true">
	<span class="lava-divider__line"></span>
	<span class="lava-divider__flow"></span>
</div>

<style>
	.lava-divider {
		position: relative;
		width: min(82%, 60rem);
		height: 2px;
		margin: 0 auto;
		overflow: hidden;
		isolation: isolate;
	}

	/* Brasa base — grieta tenue siempre presente. */
	.lava-divider__line {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			transparent,
			color-mix(in srgb, var(--color-blood) 70%, transparent) 30%,
			color-mix(in srgb, var(--color-lava) 90%, transparent) 50%,
			color-mix(in srgb, var(--color-blood) 70%, transparent) 70%,
			transparent
		);
		box-shadow: 0 0 8px rgba(255, 59, 33, 0.4);
		opacity: 0.55;
		animation: lava-breathe 5s ease-in-out infinite;
	}

	/* Reflejo de lava que fluye lateralmente. */
	.lava-divider__flow {
		position: absolute;
		top: 0;
		left: 0;
		width: 40%;
		height: 100%;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 107, 44, 0.9) 50%,
			transparent
		);
		filter: blur(1px);
		transform: translateX(-120%);
		animation: lava-flow 6.5s ease-in-out infinite;
		will-change: transform;
	}

	@keyframes lava-flow {
		0% {
			transform: translateX(-120%);
		}
		50% {
			transform: translateX(320%);
		}
		100% {
			transform: translateX(-120%);
		}
	}
	@keyframes lava-breathe {
		0%,
		100% {
			opacity: 0.4;
		}
		50% {
			opacity: 0.7;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lava-divider__line {
			animation: none;
			opacity: 0.5;
		}
		.lava-divider__flow {
			animation: none;
			transform: translateX(-120%);
			opacity: 0;
		}
	}
</style>
