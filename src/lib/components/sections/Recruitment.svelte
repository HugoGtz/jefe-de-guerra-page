<script lang="ts">
	import Section from '$lib/components/layout/Section.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { tilt } from '$lib/actions/tilt';
	import { recruitment } from '$lib/data/recruitment';
</script>

<Section id="reclutamiento" eyebrow="Reclutamiento" title="Únete a la lucha">
	<p class="recruit__intro" use:reveal>{recruitment.intro}</p>

	<div class="recruit__grid">
		<div class="recruit__needs" use:reveal={{ delay: 100, direction: 'left', blur: true }}>
			<h3 class="recruit__subtitle text-engraved">Buscamos</h3>
			<ul class="needs">
				{#each recruitment.needs as need, i (need.label)}
					<li
						class="need metal-border need--{need.priority}"
						use:reveal={{
							delay: 140 + i * 60,
							threshold: 0.05,
							direction: i % 2 === 0 ? 'left' : 'right'
						}}
					>
						<span class="need__label">{need.label}</span>
						<span class="need__priority">{need.priority}</span>
					</li>
				{/each}
			</ul>
		</div>

		<div class="recruit__reqs" use:reveal={{ delay: 200, direction: 'right', blur: true }}>
			<h3 class="recruit__subtitle text-engraved">Requisitos</h3>
			<ul class="reqs">
				{#each recruitment.requirements as req, i (req)}
					<li class="req" use:reveal={{ delay: 220 + i * 60, threshold: 0.05 }}>
						<span class="req__marker" aria-hidden="true"></span>
						{req}
					</li>
				{/each}
			</ul>
		</div>
	</div>

	<div use:reveal={{ delay: 280 }}>
		<div class="recruit__cta surface" use:tilt={{ max: 4 }}>
			<h3 class="recruit__cta-title text-lava-glow">¿Te sumas a la Horda?</h3>
			<p class="recruit__cta-text">
				Escríbenos por Discord, cuéntanos tu clase y experiencia, y te haremos una prueba en
				el próximo raid.
			</p>
			<div class="recruit__cta-actions">
				<Button
					variant="primary"
					href={recruitment.discordUrl}
					target="_blank"
					rel="noopener noreferrer"
					beam
					pulse>Unirse por Discord</Button
				>
				<Button
					variant="ghost"
					href={recruitment.whatsappUrl}
					target="_blank"
					rel="noopener noreferrer">Grupo de WhatsApp</Button
				>
				<Button variant="ghost" href="#aplica">Rellenar formulario</Button>
			</div>
			<div class="recruit__cta-copy">
				<CopyButton value={recruitment.discordUrl} label="Copiar Discord" />
			</div>
		</div>
	</div>
</Section>

<style>
	.recruit__intro {
		max-width: 44rem;
		margin: 0 auto 3rem;
		text-align: center;
		color: var(--color-steel);
		font-size: 1.1rem;
		line-height: 1.7;
	}
	.recruit__grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
		margin-bottom: 3rem;
	}
	.recruit__subtitle {
		font-size: 1.25rem;
		letter-spacing: 0.03em;
		margin: 0 0 1.25rem;
	}

	.needs {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	.need {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.55rem 0.95rem;
		border-radius: 4px;
		background-color: var(--color-stone);
	}
	.need__label {
		font-family: var(--font-display);
		font-weight: 600;
		color: var(--color-silver);
		font-size: 0.92rem;
	}
	.need__priority {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 0.12rem 0.45rem;
		border-radius: 999px;
	}
	.need--alta .need__priority {
		color: var(--color-ash);
		background: linear-gradient(135deg, var(--color-lava), var(--color-ember));
	}
	.need--media .need__priority {
		color: var(--color-silver);
		background-color: color-mix(in srgb, var(--color-blood) 70%, transparent);
	}
	.need--baja .need__priority {
		color: var(--color-steel);
		background-color: color-mix(in srgb, var(--color-steel) 18%, transparent);
	}

	.reqs {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.85rem;
	}
	.req {
		display: flex;
		align-items: flex-start;
		gap: 0.7rem;
		color: var(--color-steel);
		line-height: 1.5;
	}
	.req__marker {
		flex-shrink: 0;
		margin-top: 0.45rem;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--color-lava), var(--color-blood));
		box-shadow: 0 0 6px rgba(255, 59, 33, 0.5);
	}

	.recruit__cta {
		text-align: center;
		padding: clamp(2rem, 5vw, 3rem);
		border-radius: 8px;
		max-width: 40rem;
		margin: 0 auto;
	}
	.recruit__cta-title {
		font-size: clamp(1.4rem, 4vw, 2rem);
		margin: 0 0 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.recruit__cta-text {
		color: var(--color-steel);
		line-height: 1.6;
		margin: 0 0 1.75rem;
	}
	.recruit__cta-actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.85rem;
	}
	.recruit__cta-copy {
		margin-top: 1rem;
	}

	@media (min-width: 540px) {
		.recruit__cta-actions {
			flex-direction: row;
			justify-content: center;
		}
	}

	@media (min-width: 720px) {
		.recruit__grid {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
