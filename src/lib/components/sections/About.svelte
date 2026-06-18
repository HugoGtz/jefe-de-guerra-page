<script lang="ts">
	import Section from '$lib/components/layout/Section.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { reveal } from '$lib/actions/reveal';
	import type { Guild } from '$lib/data/guild';

	let { guild }: { guild: Guild } = $props();
</script>

<Section id="la-guild" eyebrow="La Guild" title="Quiénes somos">
	<div class="about__grid">
		<div use:reveal={{ direction: 'left', blur: true }}>
			<Card class="about__card">
				<h3 class="about__card-title text-engraved">Nuestra hermandad</h3>
				{#each guild.aboutWhoWeAre as p (p)}
					<!-- Copy con énfasis controlado desde data (solo <strong>). -->
					<p class="about__text">{@html p}</p>
				{/each}
			</Card>
		</div>

		<div use:reveal={{ delay: 120, direction: 'right', blur: true }}>
			<Card class="about__card">
				<h3 class="about__card-title text-engraved">El ambiente</h3>
				{#each guild.aboutVibe as p (p)}
					<p class="about__text">{@html p}</p>
				{/each}
			</Card>
		</div>
	</div>
</Section>

<style>
	.about__grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}
	:global(.about__card) {
		height: 100%;
	}
	.about__card-title {
		font-size: 1.4rem;
		margin: 0 0 1rem;
		letter-spacing: 0.03em;
	}
	.about__text {
		color: var(--color-steel);
		line-height: 1.7;
		margin: 0 0 1rem;
	}
	.about__text:last-child {
		margin-bottom: 0;
	}
	.about__text :global(strong) {
		color: var(--color-silver);
		font-weight: 700;
	}

	@media (min-width: 720px) {
		.about__grid {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
