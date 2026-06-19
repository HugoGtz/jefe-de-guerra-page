<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import WebGLBackground from '$lib/components/WebGLBackground.svelte';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import ScrollProgress from '$lib/components/ScrollProgress.svelte';
	import CursorGlow from '$lib/components/CursorGlow.svelte';
	import BackToTop from '$lib/components/BackToTop.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<!-- Primer elemento enfocable: saltar la navegación e ir al contenido. -->
<a href="#contenido" class="skip-link">Saltar al contenido</a>

<!-- Fondo WebGL (se posiciona fixed / z-index:-1 por sí mismo). -->
<WebGLBackground />

<!-- Resplandor rojo ambiental que sigue al cursor (fixed, detrás del contenido). -->
<CursorGlow />

<!-- Barra de progreso de scroll (fija, por encima del navbar). -->
<ScrollProgress />

<Navbar />

<main id="contenido" tabindex="-1">
	{@render children()}
</main>

<Footer />

<!-- Botón flotante "volver arriba" (fixed, por debajo del navbar). -->
<BackToTop />

<!--
	Estilos globales para la action `reveal` (fade + slide-in al entrar en
	viewport). Definidos aquí porque app.css es propiedad de otro agente.
-->
<style>
	/* El contenido principal y el footer deben quedar por encima del
	   resplandor del cursor (fixed, z-index:0) sin tapar el navbar (z:50). */
	main {
		position: relative;
		z-index: 1;
	}

	:global(.reveal) {
		transition:
			opacity 0.5s ease,
			transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
			filter 0.5s ease;
		transition-delay: var(--reveal-delay, 0ms);
		will-change: opacity, transform;
	}
	/* Entrada un poco más viva: fade + slide-up + leve scale. */
	:global(.reveal.is-hidden) {
		opacity: 0;
		transform: translateY(32px) scale(0.97);
	}
	:global(.reveal.is-revealed) {
		opacity: 1;
		transform: translateY(0) scale(1);
		filter: none;
	}

	/* Variantes direccionales: slide-in lateral en lugar de subir. */
	:global(.reveal--left.is-hidden) {
		transform: translateX(-24px) scale(0.97);
	}
	:global(.reveal--right.is-hidden) {
		transform: translateX(24px) scale(0.97);
	}
	:global(.reveal--left.is-revealed),
	:global(.reveal--right.is-revealed) {
		transform: translateX(0) scale(1);
	}

	/* Blur-in sutil: se aclara al revelar. */
	:global(.reveal--blur.is-hidden) {
		filter: blur(8px);
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.reveal),
		:global(.reveal.is-hidden),
		:global(.reveal.is-revealed),
		:global(.reveal--left.is-hidden),
		:global(.reveal--right.is-hidden),
		:global(.reveal--blur.is-hidden) {
			transition: none;
			opacity: 1;
			transform: none;
			filter: none;
		}
	}
</style>
