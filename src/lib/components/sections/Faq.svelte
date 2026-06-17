<script lang="ts">
	import Section from '$lib/components/layout/Section.svelte';
	import { reveal } from '$lib/actions/reveal';
	import type { FaqItem } from '$lib/data/faq';

	let { faq }: { faq: FaqItem[] } = $props();

	// Índices de los items abiertos. Se permite tener varios abiertos a la vez.
	let open = $state<Set<number>>(new Set());

	function toggle(i: number) {
		// Reasignar para que la reactividad de runes detecte el cambio.
		const next = new Set(open);
		if (next.has(i)) {
			next.delete(i);
		} else {
			next.add(i);
		}
		open = next;
	}
</script>

<Section id="faq" eyebrow="Antes de aplicar" title="Preguntas frecuentes">
	<ul class="faq" use:reveal>
		{#each faq as item, i (item.q)}
			{@const isOpen = open.has(i)}
			<li class="faq__item metal-border" class:faq__item--open={isOpen}>
				<h3 class="faq__heading">
					<button
						type="button"
						class="faq__trigger"
						id="faq-trigger-{i}"
						aria-expanded={isOpen}
						aria-controls="faq-panel-{i}"
						onclick={() => toggle(i)}
					>
						<span class="faq__q text-engraved">{item.q}</span>
						<span class="faq__icon" aria-hidden="true" class:faq__icon--open={isOpen}>
							<svg viewBox="0 0 16 16" width="16" height="16" fill="none">
								<path
									d="M3 6l5 5 5-5"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</span>
					</button>
				</h3>
				<div
					id="faq-panel-{i}"
					class="faq__panel"
					role="region"
					aria-labelledby="faq-trigger-{i}"
					hidden={!isOpen}
				>
					<p class="faq__a">{item.a}</p>
				</div>
			</li>
		{/each}
	</ul>
</Section>

<style>
	.faq {
		list-style: none;
		margin: 0 auto;
		padding: 0;
		max-width: 48rem;
		display: grid;
		gap: 0.85rem;
	}

	.faq__item {
		border-radius: 4px;
		background-color: var(--color-stone);
		overflow: hidden;
	}

	.faq__heading {
		margin: 0;
		font-size: inherit;
		font-weight: inherit;
	}

	.faq__trigger {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.1rem 1.25rem;
		background: transparent;
		border: 0;
		cursor: pointer;
		text-align: left;
		color: var(--color-silver);
		transition: color 0.2s ease;
	}
	.faq__trigger:hover .faq__q {
		color: var(--color-lava);
	}
	.faq__trigger:focus-visible {
		outline: 2px solid var(--color-lava);
		outline-offset: -2px;
	}

	.faq__q {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: clamp(0.98rem, 2.4vw, 1.1rem);
		letter-spacing: 0.01em;
		line-height: 1.35;
		transition: color 0.2s ease;
	}

	.faq__icon {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
		color: var(--color-lava);
		background-color: color-mix(in srgb, var(--color-blood) 25%, transparent);
		transition:
			transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
			background-color 0.25s ease;
		will-change: transform;
	}
	.faq__icon--open {
		transform: rotate(180deg);
		background-color: color-mix(in srgb, var(--color-blood) 55%, transparent);
	}

	/* Animación abrir/cerrar con grid-template-rows (0fr → 1fr): solo afecta a
	   propiedades compositables-friendly del contenido (transform/opacity) y
	   evita medir alturas en JS. El panel se oculta con [hidden] para a11y. */
	.faq__panel {
		display: grid;
		grid-template-rows: 0fr;
		opacity: 0;
		transition:
			grid-template-rows 0.32s cubic-bezier(0.22, 1, 0.36, 1),
			opacity 0.32s ease;
	}
	.faq__item--open .faq__panel {
		grid-template-rows: 1fr;
		opacity: 1;
	}
	/* El hijo directo debe poder colapsar a 0 dentro de la fila de grid. */
	.faq__panel > .faq__a {
		min-height: 0;
		overflow: hidden;
	}

	.faq__a {
		margin: 0;
		padding: 0 1.25rem 1.2rem;
		color: var(--color-steel);
		line-height: 1.65;
		font-size: 0.98rem;
	}

	/* [hidden] por defecto pone display:none; lo neutralizamos para poder animar
	   el cierre. La accesibilidad se mantiene vía aria-expanded en el trigger. */
	.faq__panel[hidden] {
		display: grid;
	}

	@media (prefers-reduced-motion: reduce) {
		.faq__icon,
		.faq__panel {
			transition: none;
		}
	}
</style>
