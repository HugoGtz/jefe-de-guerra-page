<script lang="ts">
	import Section from '$lib/components/layout/Section.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { tilt } from '$lib/actions/tilt';
	import type { Recruitment, RecruitNeed } from '$lib/data/recruitment';
	import { resolveRecruitNeed } from '$lib/wow-icons';

	let { recruitment }: { recruitment: Recruitment } = $props();

	type Priority = RecruitNeed['priority'];

	const PRIORITY_ORDER: Record<Priority, number> = { alta: 0, media: 1, baja: 2 };
	const PRIORITY_LABEL: Record<Priority, string> = {
		alta: 'Prioridad alta',
		media: 'Prioridad media',
		baja: 'Prioridad baja'
	};

	// Resolve each need's icon/class/color once, then sort by urgency
	// (Alta → Media → Baja) so the most-wanted roles read first.
	const resolvedNeeds = $derived(
		recruitment.needs
			.map((need) => ({ need, resolved: resolveRecruitNeed(need.label) }))
			.sort((a, b) => PRIORITY_ORDER[a.need.priority] - PRIORITY_ORDER[b.need.priority])
	);
</script>

<Section id="reclutamiento" eyebrow="Reclutamiento" title="Únete a la lucha">
	<p class="recruit__intro" use:reveal>{recruitment.intro}</p>

	<div class="recruit__grid">
		<div class="recruit__needs" use:reveal={{ delay: 100, direction: 'left', blur: true }}>
			<h3 class="recruit__subtitle text-engraved">Buscamos</h3>
			<ul class="needs">
				{#each resolvedNeeds as { need, resolved }, i (need.label)}
					<li
						class="need metal-border need--{need.priority}"
						style={resolved.color ? `--class-color: ${resolved.color}` : ''}
						use:reveal={{
							delay: 140 + i * 55,
							threshold: 0.05,
							direction: i % 2 === 0 ? 'left' : 'right'
						}}
					>
						<span class="need__icon" aria-hidden="true">
							{#if resolved.iconUrl}
								<img
									class="need__img"
									src={resolved.iconUrl}
									alt=""
									width="40"
									height="40"
									loading="lazy"
									decoding="async"
								/>
							{:else}
								<span class="need__fallback">{need.label.charAt(0)}</span>
							{/if}
						</span>

						<span class="need__body">
							<span class="need__label">{need.label}</span>
							<span class="need__priority">{PRIORITY_LABEL[need.priority]}</span>
						</span>

						<span class="need__flame" aria-hidden="true"></span>
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
				Rellena el formulario contándonos tu clase y experiencia. Tras enviarlo te daremos
				acceso a nuestro Discord y al grupo de WhatsApp, y te haremos una prueba en el
				próximo raid.
			</p>
			<div class="recruit__cta-actions">
				<Button variant="primary" href="#aplica" beam>Rellenar formulario</Button>
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

	/* --- Buscamos: rich class/spec rows ------------------------------------ */
	.needs {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.6rem;
	}

	.need {
		--class-color: var(--color-steel);
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.6rem 0.8rem;
		border-radius: 6px;
		background-color: var(--color-stone);
		overflow: hidden;
	}
	/* Left accent bar tinted by the class color. */
	.need::before {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: 3px;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--class-color) 85%, transparent),
			color-mix(in srgb, var(--class-color) 35%, transparent)
		);
	}

	.need__icon {
		position: relative;
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 8px;
		background: color-mix(in srgb, var(--color-stone) 70%, #000);
		border: 1px solid color-mix(in srgb, var(--class-color) 45%, transparent);
		box-shadow:
			inset 0 1px 0 rgba(229, 229, 229, 0.08),
			0 0 10px color-mix(in srgb, var(--class-color) 22%, transparent);
	}
	.need__img {
		width: 34px;
		height: 34px;
		border-radius: 6px;
		object-fit: cover;
	}
	.need__fallback {
		font-family: var(--font-display);
		font-size: 1.15rem;
		font-weight: 900;
		color: color-mix(in srgb, var(--class-color) 80%, var(--color-silver));
	}

	.need__body {
		min-width: 0;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.need__label {
		font-family: var(--font-display);
		font-weight: 700;
		color: var(--color-silver);
		font-size: 0.98rem;
		line-height: 1.15;
		/* Subtle class tint on the name without hurting legibility. */
		color: color-mix(in srgb, var(--class-color) 28%, var(--color-silver));
	}
	.need__priority {
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-steel-dim);
	}

	/* Priority "flame" indicator on the right: count + intensity by urgency. */
	.need__flame {
		flex-shrink: 0;
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
	.need--alta {
		background-color: color-mix(in srgb, var(--color-blood) 14%, var(--color-stone));
	}
	.need--alta .need__priority {
		color: var(--color-ember);
	}
	.need--alta .need__flame {
		background: radial-gradient(circle, var(--color-lava), var(--color-blood));
		box-shadow:
			0 0 8px rgba(255, 59, 33, 0.85),
			0 0 16px rgba(161, 6, 19, 0.55);
		animation: jdg-pulse 2.2s ease-in-out infinite;
	}
	.need--media .need__flame {
		background: color-mix(in srgb, var(--color-blood) 70%, transparent);
		box-shadow: 0 0 6px rgba(161, 6, 19, 0.45);
	}
	.need--baja .need__flame {
		background: color-mix(in srgb, var(--color-steel) 35%, transparent);
	}

	/* --- Requisitos -------------------------------------------------------- */
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

	/* --- CTA (behavior unchanged) ----------------------------------------- */
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
		/* Two-up needs grid on wide screens for density. */
		.needs {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
