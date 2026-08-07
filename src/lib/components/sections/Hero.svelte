<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { cursorTilt } from '$lib/actions/cursorTilt';
	import { pauseOffscreen } from '$lib/actions/pauseOffscreen';
	import { getReducedMotion } from '$lib/utils/reducedMotion';
	import type { Guild } from '$lib/data/guild';

	let { guild }: { guild: Guild } = $props();

	// Zona de referencia para la inclinación 3D del logo (todo el héroe).
	let heroEl = $state<HTMLElement>();

	// Real three.js crest (perspective camera + crest plane + a further-back
	// glow plane, so tilt shows genuine parallax) layered OVER the static
	// <img> below. The <img> is the permanent fallback — always rendered, for
	// SSR/no-JS/reduced-motion/WebGL-unavailable — and is only visually hidden
	// once the 3D crest's texture has actually loaded. See HeroCrestScene.ts.
	let logo3dCanvas = $state<HTMLCanvasElement>();
	let logo3dReady = $state(false);

	$effect(() => {
		if (!logo3dCanvas || !heroEl || getReducedMotion()) return;
		const zone = heroEl;
		const canvasEl = logo3dCanvas;

		let cancelled = false;
		let heroCrest: import('$lib/three/HeroCrestScene').HeroCrestScene | null = null;
		let observer: IntersectionObserver | null = null;

		const finePointer =
			typeof window.matchMedia === 'function' &&
			window.matchMedia('(hover: hover) and (pointer: fine)').matches;

		const onMove = (e: PointerEvent) => {
			if (e.pointerType !== 'mouse') return;
			const rect = zone.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0) return;
			heroCrest?.setCursor(
				(e.clientX - rect.left) / rect.width - 0.5,
				(e.clientY - rect.top) / rect.height - 0.5
			);
		};
		const onLeave = () => heroCrest?.resetCursor();

		import('$lib/three/HeroCrestScene').then(({ HeroCrestScene }) => {
			if (cancelled) return;
			const scene = new HeroCrestScene(canvasEl, { src: '/logo.webp' });
			heroCrest = scene;
			scene.ready.then(() => {
				if (!cancelled) logo3dReady = true;
			});

			if ('IntersectionObserver' in window) {
				observer = new IntersectionObserver(
					(entries) => {
						if (entries[0]?.isIntersecting) scene.start();
						else scene.stop();
					},
					{ threshold: 0.1 }
				);
				observer.observe(zone);
			} else {
				scene.start();
			}

			if (finePointer) {
				zone.addEventListener('pointermove', onMove, { passive: true });
				zone.addEventListener('pointerleave', onLeave, { passive: true });
			}
		});

		return () => {
			cancelled = true;
			observer?.disconnect();
			zone.removeEventListener('pointermove', onMove);
			zone.removeEventListener('pointerleave', onLeave);
			heroCrest?.dispose();
			heroCrest = null;
		};
	});
</script>

<section bind:this={heroEl} id="inicio" class="hero" use:pauseOffscreen>
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
							class:is-hidden={logo3dReady}
							fetchpriority="high"
							decoding="async"
						/>
					</picture>
					<canvas bind:this={logo3dCanvas} class="hero__logo-3d" class:is-ready={logo3dReady}
					></canvas>
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
		padding: 6rem var(--spacing-2xl) 4rem;
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
		margin-bottom: var(--spacing-3xl);
	}
	/* Wrapper externo: inclinación 3D hacia el cursor (la action fija el
	   transform). transform-style aquí para que el hijo 3D componga. */
	.hero__logo-tilt {
		transform-style: preserve-3d;
	}
	/* Flotación idle continua, independiente de la entrada "forja" del <img>. */
	.hero__logo-float {
		position: relative;
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
		transition: opacity 0.4s ease;
	}
	/* Faded out once the real three.js crest (.hero__logo-3d) has loaded and
	   taken over — kept in the DOM (not display:none) so layout/SEO/no-JS/
	   reduced-motion/WebGL-unavailable all still show the plain image.
	   `animation: none` is required here: hero-forge's `both` fill-mode pins
	   opacity at its final keyframe value (1) forever once it completes, which
	   otherwise overrides this rule regardless of specificity/source order. */
	.hero__logo.is-hidden {
		animation: none;
		opacity: 0;
	}
	/* Real three.js crest — perspective camera + textured plane + a
	   further-back glow plane, see HeroCrestScene.ts. Sits exactly over the
	   <img> above; invisible (opacity 0) until its texture has loaded, then
	   crossfades in as the <img> fades out. Never mounted under
	   prefers-reduced-motion (the mount effect bails out early). */
	.hero__logo-3d {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		transition: opacity 0.4s ease;
		pointer-events: none;
	}
	.hero__logo-3d.is-ready {
		opacity: 1;
	}

	.hero__name {
		/* Factor vw contenido para que "JEFE DE GUERRA" quepa en una línea en el
		   rango medio (tablet/ventana angosta) sin recortarse. */
		font-size: clamp(1.8rem, 7vw, 4.5rem);
		font-weight: 900;
		letter-spacing: var(--tracking-heading);
		text-transform: uppercase;
		margin: 0;
		line-height: 1.02;
		max-width: 100%;
		/* Item de un flex column: sin esto (min-width:auto) no encoge bajo su
		   max-content y desborda (lo recorta el overflow:hidden del hero). Con
		   min-width:0 envuelve en vez de recortarse — red de seguridad. */
		min-width: 0;
		animation: hero-rise 0.6s ease-out 0.15s both;
	}
	/* En pantallas estrechas, reducir el tracking para ganar holgura
	   horizontal y garantizar que el título nunca desborde el viewport. */
	@media (max-width: 414px) {
		.hero__name {
			letter-spacing: var(--tracking-snug);
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
		filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.7)) drop-shadow(0 0 14px rgba(255, 59, 33, 0.18));
		animation: hero-shimmer 5s linear infinite;
		will-change: background-position;
	}

	.hero__motto {
		color: var(--color-steel);
		font-family: var(--font-display);
		font-size: clamp(1rem, 2.4vw, 1.35rem);
		font-style: italic;
		letter-spacing: var(--tracking-snug);
		margin: var(--spacing-xl) 0 0;
		animation: hero-rise 0.6s ease-out 0.3s both;
	}

	.hero__badge {
		margin-top: var(--spacing-3xl);
		animation: hero-rise 0.6s ease-out 0.45s both;
	}

	.hero__actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xl);
		justify-content: center;
		margin-top: var(--spacing-4xl);
		animation: hero-rise 0.6s ease-out 0.6s both;
	}

	.hero__scroll {
		position: absolute;
		bottom: 1.75rem;
		/* Centrado sin `transform` (con left/right:0 + margin auto): así la
		   animación hero-rise, que SÍ usa transform, no pisa el centrado. */
		left: 0;
		right: 0;
		width: max-content;
		margin-inline: auto;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-xs);
		text-decoration: none;
		color: var(--color-steel-dim);
		animation: hero-rise 0.6s ease-out 0.75s both;
	}
	.hero__scroll-text {
		font-family: var(--font-display);
		font-size: var(--text-xs);
		letter-spacing: 0.2em;
		/* Compensa el espacio que letter-spacing añade tras la última letra, para
		   que el texto quede ópticamente centrado bajo el chevron. */
		text-indent: 0.2em;
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
