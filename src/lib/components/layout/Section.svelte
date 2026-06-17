<script lang="ts">
	import type { Snippet } from 'svelte';
	import { reveal } from '$lib/actions/reveal';

	type Props = {
		id: string;
		eyebrow?: string;
		title?: string;
		class?: string;
		children?: Snippet;
	};

	let { id, eyebrow, title, class: className = '', children }: Props = $props();
</script>

<section {id} class="section {className}">
	<div class="section__inner">
		{#if eyebrow || title}
			<header class="section__head" use:reveal>
				{#if eyebrow}
					<p class="section__eyebrow text-lava-glow">{eyebrow}</p>
				{/if}
				{#if title}
					<h2 class="section__title text-engraved">{title}</h2>
				{/if}
				<span class="section__rule" aria-hidden="true"></span>
			</header>
		{/if}

		<div class="section__body">
			{@render children?.()}
		</div>
	</div>
</section>

<style>
	.section {
		position: relative;
		padding: clamp(4rem, 9vw, 7rem) 1.25rem;
	}
	.section__inner {
		max-width: 72rem;
		margin: 0 auto;
	}
	.section__head {
		text-align: center;
		margin-bottom: clamp(2.5rem, 5vw, 4rem);
	}
	.section__eyebrow {
		font-family: var(--font-display);
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		margin: 0 0 0.75rem;
	}
	.section__title {
		font-size: clamp(2rem, 5vw, 3.2rem);
		font-weight: 900;
		letter-spacing: 0.02em;
		line-height: 1.05;
		margin: 0;
		/* Barrido de máscara izquierda→derecha al revelar la cabecera. */
		clip-path: inset(0 100% 0 0);
		transition: clip-path 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.1s;
		will-change: clip-path;
	}
	:global(.section__head.is-revealed) .section__title {
		clip-path: inset(0 0 0 0);
	}

	/* Subrayado de cabecera con "trazo" animado al revelar la sección. */
	.section__rule {
		display: block;
		width: clamp(56px, 8vw, 96px);
		height: 3px;
		margin: 1.1rem auto 0;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			transparent,
			var(--color-lava) 25%,
			var(--color-ember) 75%,
			transparent
		);
		box-shadow: 0 0 10px rgba(255, 59, 33, 0.6);
		transform: scaleX(0);
		transform-origin: center;
		transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.2s;
	}
	/* `reveal` añade .is-revealed al <header> al entrar en viewport. */
	:global(.section__head.is-revealed) .section__rule {
		transform: scaleX(1);
	}

	@media (prefers-reduced-motion: reduce) {
		.section__rule {
			transition: none;
			transform: scaleX(1);
		}
		.section__title {
			transition: none;
			clip-path: none;
		}
	}
</style>
