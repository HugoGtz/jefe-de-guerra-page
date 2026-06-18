<script lang="ts">
	import Section from '$lib/components/layout/Section.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { tilt } from '$lib/actions/tilt';
	import type { Officer } from '$lib/data/officers';

	let { officers }: { officers: Officer[] } = $props();
</script>

<Section id="oficiales" eyebrow="Oficiales" title="El consejo de guerra">
	<div class="officers__grid">
		{#each officers as officer, i (officer.name)}
			<div
				use:reveal={{
					delay: i * 90,
					direction: i % 2 === 0 ? 'left' : 'right',
					blur: true
				}}
			>
				<div use:tilt={{ max: 5 }} class="officer-tilt">
					<Card class="officer">
						<div class="officer__top">
							<span class="officer__avatar" aria-hidden="true">
								{officer.name.charAt(0)}
							</span>
							<div>
								<h3 class="officer__name text-engraved">{officer.name}</h3>
								<p class="officer__role text-lava-glow">{officer.role}</p>
							</div>
						</div>
						{#if officer.classLabel}
							<p class="officer__class">{officer.classLabel}</p>
						{/if}
						{#if officer.line}
							<p class="officer__line">{officer.line}</p>
						{/if}
					</Card>
				</div>
			</div>
		{/each}
	</div>
</Section>

<style>
	.officers__grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}
	.officer-tilt {
		height: 100%;
	}
	:global(.officer) {
		height: 100%;
		display: flex;
		flex-direction: column;
	}
	.officer__top {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		margin-bottom: 1rem;
	}
	.officer__avatar {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		font-family: var(--font-display);
		font-size: 1.4rem;
		font-weight: 900;
		color: var(--color-silver);
		background: linear-gradient(
			135deg,
			var(--color-crimson-deep),
			var(--color-blood)
		);
		border: 1px solid color-mix(in srgb, var(--color-steel) 40%, transparent);
		box-shadow: inset 0 1px 0 rgba(229, 229, 229, 0.15);
	}
	.officer__name {
		font-size: 1.2rem;
		font-weight: 700;
		margin: 0;
		letter-spacing: 0.02em;
	}
	.officer__role {
		font-family: var(--font-display);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		margin: 0.2rem 0 0;
	}
	.officer__class {
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-steel-dim);
		margin: 0 0 0.75rem;
	}
	.officer__line {
		color: var(--color-steel);
		line-height: 1.6;
		margin: 0;
		font-size: 0.95rem;
	}

	@media (min-width: 600px) {
		.officers__grid {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (min-width: 980px) {
		.officers__grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}
</style>
