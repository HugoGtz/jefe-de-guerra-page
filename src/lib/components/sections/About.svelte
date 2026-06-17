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

	<div class="about__schedule metal-border" use:reveal={{ delay: 200 }}>
		<h3 class="about__schedule-title text-lava-glow">Horario de raids</h3>
		<dl class="about__schedule-grid">
			<div class="about__schedule-item" use:reveal={{ delay: 260, threshold: 0.05 }}>
				<dt>Días</dt>
				<dd>{guild.schedule.days}</dd>
			</div>
			<div class="about__schedule-item" use:reveal={{ delay: 340, threshold: 0.05 }}>
				<dt>Horario</dt>
				<dd>{guild.schedule.time}</dd>
			</div>
			<div class="about__schedule-item" use:reveal={{ delay: 420, threshold: 0.05 }}>
				<dt>Zona horaria</dt>
				<dd>{guild.schedule.timezone}</dd>
			</div>
		</dl>
		<p class="about__schedule-tz">
			Horarios en {guild.schedule.timezone} (hora peninsular de España). Ajusta según tu zona.
		</p>
		{#if guild.schedule.note}
			<p class="about__schedule-note">{guild.schedule.note}</p>
		{/if}
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

	.about__schedule {
		margin-top: 2rem;
		padding: 2rem clamp(1.25rem, 4vw, 2.5rem);
		border-radius: 6px;
		background-color: color-mix(in srgb, var(--color-stone) 80%, transparent);
	}
	.about__schedule-title {
		font-size: 1.1rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		text-align: center;
		margin: 0 0 1.5rem;
	}
	.about__schedule-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.25rem;
		margin: 0;
	}
	.about__schedule-item {
		text-align: center;
		border-left: 2px solid color-mix(in srgb, var(--color-blood) 60%, transparent);
		padding-left: 1rem;
	}
	.about__schedule-item dt {
		font-family: var(--font-display);
		font-size: 0.75rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-steel-dim);
		margin-bottom: 0.35rem;
	}
	.about__schedule-item dd {
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--color-silver);
	}
	.about__schedule-tz {
		text-align: center;
		color: var(--color-steel-dim);
		font-size: 0.8rem;
		margin: 1.5rem 0 0;
	}
	.about__schedule-note {
		text-align: center;
		color: var(--color-steel-dim);
		font-size: 0.85rem;
		font-style: italic;
		margin: 0.5rem 0 0;
	}

	@media (min-width: 720px) {
		.about__grid {
			grid-template-columns: 1fr 1fr;
		}
		.about__schedule-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>
