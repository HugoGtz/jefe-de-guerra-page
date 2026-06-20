<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { cursorTilt } from '$lib/actions/cursorTilt';
	import type { Guild } from '$lib/data/guild';

	let { guild }: { guild: Guild } = $props();

	// Zona de referencia para la inclinación 3D del logo (todo el héroe).
	let heroEl = $state<HTMLElement>();
</script>

<section bind:this={heroEl} id="inicio" class="hero">
	<!-- Resplandor rojo estático detrás del logo (decorativo). SIN parallax ni
	     blur/animación a propósito: cualquiera de esos promueve el glow a su
	     propia capa GPU que, recortada por `.hero { overflow:hidden }`, dibuja su
	     caja rectangular en la ruta ANGLE/Metal (el "cuadro" al hacer scroll). -->
	<div class="hero__glow-wrap" aria-hidden="true">
		<div class="hero__glow"></div>
	</div>

	<div class="hero__content">
		<div class="hero__logo-wrap">
			<!-- Inclinación 3D hacia el cursor en el wrapper EXTERNO; la flotación
			     idle y la entrada "forja" viven en wrappers internos para que las
			     transformaciones compongan limpiamente. -->
			<div class="hero__logo-tilt" use:cursorTilt={{ max: 8, zone: heroEl }}>
				<!-- Flotación idle continua en el wrapper, separada de la entrada "forja". -->
				<div class="hero__logo-float">
					<picture>
						<source srcset="/logo.webp" type="image/webp" />
						<img
							src="/logo.png"
							alt="Emblema de la guild Jefe de Guerra"
							width="679"
							height="588"
							class="hero__logo"
							fetchpriority="high"
							decoding="async"
						/>
					</picture>
				</div>
			</div>
		</div>

		<h1 class="hero__name font-display">
			<span class="hero__name-text">{guild.name}</span>
		</h1>
		<p class="hero__motto">{guild.motto}</p>

		<div class="hero__badge">
			<Badge>{guild.badge}</Badge>
		</div>

		<div class="hero__actions">
			<Button variant="primary" href="#reclutamiento" beam pulse>Únete a la Horda</Button>
			<Button variant="ghost" href="#progreso">Ver progreso</Button>
		</div>
	</div>

	<a href="#la-guild" class="hero__scroll" aria-label="Desplázate hacia abajo">
		<span class="hero__scroll-text">Desliza</span>
		<span class="hero__scroll-chevron" aria-hidden="true"></span>
	</a>
</section>

<style>
	.hero {
		position: relative;
		min-height: 100svh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 6rem 1.25rem 4rem;
		overflow: hidden;
	}

	.hero__glow-wrap {
		position: absolute;
		top: 38%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 0;
		pointer-events: none;
	}
	.hero__glow {
		width: min(70vw, 640px);
		height: min(70vw, 640px);
		border-radius: 50%;
		background: radial-gradient(
			circle,
			rgba(255, 59, 33, 0.32),
			rgba(161, 6, 19, 0.18) 38%,
			transparent 68%
		);
	}

	.hero__content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		/* Constreñir al ancho disponible: si no, el título (inline-block) toma su
		   ancho max-content y desborda en móvil, arrastrando badge y botones. */
		width: 100%;
		max-width: 60rem;
	}

	.hero__logo-wrap {
		width: min(72vw, 360px);
		margin-bottom: 1.5rem;
	}
	/* Wrapper externo: inclinación 3D hacia el cursor (la action fija el
	   transform). transform-style aquí para que el hijo 3D componga. */
	.hero__logo-tilt {
		transform-style: preserve-3d;
	}
	/* Flotación idle continua, independiente de la entrada "forja" del <img>. */
	.hero__logo-float {
		animation: hero-float 6s ease-in-out infinite;
		will-change: transform;
	}
	.hero__logo {
		width: 100%;
		height: auto;
		display: block;
		filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.6));
		transform-origin: center;
		/* Entrada "forja": fade + scale-up. */
		animation: hero-forge 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.hero__name {
		/* Clamp afinado para que "JEFE DE GUERRA" no se recorte a 320–414px:
		   mínimo más bajo + factor vw menor evitan el desborde con el
		   inline-block de background-clip:text. */
		font-size: clamp(1.8rem, 8vw, 4.5rem);
		font-weight: 900;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		margin: 0;
		line-height: 1.02;
		max-width: 100%;
		animation: hero-rise 0.6s ease-out 0.15s both;
	}
	/* En pantallas estrechas, reducir el tracking para ganar holgura
	   horizontal y garantizar que el título nunca desborde el viewport. */
	@media (max-width: 414px) {
		.hero__name {
			letter-spacing: 0.01em;
		}
	}
	/* Texto cromado plateado: el propio glifo es un gradiente metálico
	   recortado al texto, con varios brillos que se desplazan en bucle
	   continuo. Lee como "plateado brillante", no gris. */
	.hero__name-text {
		display: inline-block;
		max-width: 100%;
		background-image: linear-gradient(
			100deg,
			#8f9298 0%,
			#ffffff 16%,
			#e8e8ea 30%,
			#ffffff 48%,
			#c4c7cc 64%,
			#ffffff 80%,
			#8f9298 100%
		);
		background-size: 200% 100%;
		/* Repetido (extremos del mismo color = costura invisible) para que el
		   texto SIEMPRE tenga relleno y nunca desaparezca al desplazarse. */
		background-repeat: repeat;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		-webkit-text-fill-color: transparent;
		/* Profundidad (text-shadow no se ve con relleno transparente). */
		filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.7))
			drop-shadow(0 0 14px rgba(255, 59, 33, 0.18));
		animation: hero-shimmer 5s linear infinite;
		will-change: background-position;
	}

	.hero__motto {
		color: var(--color-steel);
		font-family: var(--font-display);
		font-size: clamp(1rem, 2.4vw, 1.35rem);
		font-style: italic;
		letter-spacing: 0.03em;
		margin: 1rem 0 0;
		animation: hero-rise 0.6s ease-out 0.3s both;
	}

	.hero__badge {
		margin-top: 1.5rem;
		animation: hero-rise 0.6s ease-out 0.45s both;
	}

	.hero__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: center;
		margin-top: 2rem;
		animation: hero-rise 0.6s ease-out 0.6s both;
	}

	.hero__scroll {
		position: absolute;
		bottom: 1.75rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: var(--color-steel-dim);
		animation: hero-rise 0.6s ease-out 0.75s both;
	}
	.hero__scroll-text {
		font-family: var(--font-display);
		font-size: 0.7rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
	}
	.hero__scroll-chevron {
		width: 12px;
		height: 12px;
		border-right: 2px solid var(--color-lava);
		border-bottom: 2px solid var(--color-lava);
		transform: rotate(45deg);
		animation: hero-bounce 1.8s ease-in-out infinite;
	}

	@keyframes hero-forge {
		from {
			opacity: 0;
			transform: scale(0.78);
			filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.6)) brightness(0.5);
		}
		to {
			opacity: 1;
			transform: scale(1);
			filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.6)) brightness(1);
		}
	}
	/* Entrada un punto más dramática: slide + leve scale (compositor-safe). */
	@keyframes hero-rise {
		from {
			opacity: 0;
			transform: translateY(22px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	@keyframes hero-bounce {
		0%,
		100% {
			transform: rotate(45deg) translate(0, 0);
		}
		50% {
			transform: rotate(45deg) translate(3px, 3px);
		}
	}
	@keyframes hero-float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-10px);
		}
	}
	@keyframes hero-shimmer {
		from {
			background-position: 200% 0;
		}
		to {
			background-position: -200% 0;
		}
	}

	/* Respeto total a prefers-reduced-motion: mostrar sin animar. */
	@media (prefers-reduced-motion: reduce) {
		.hero__logo,
		.hero__name,
		.hero__motto,
		.hero__badge,
		.hero__actions,
		.hero__scroll {
			animation: none;
			opacity: 1;
			transform: none;
		}
		.hero__scroll-chevron {
			animation: none;
		}
		.hero__logo-float {
			animation: none;
		}
		.hero__name-text {
			animation: none;
			background-position: 35% 0;
		}
	}
</style>
