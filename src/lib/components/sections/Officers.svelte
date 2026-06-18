<script lang="ts">
	import Section from '$lib/components/layout/Section.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { tilt } from '$lib/actions/tilt';
	import type { Officer } from '$lib/data/officers';
	import { parseColor } from '$lib/parse';
	import { classIconUrl, specIconUrl } from '$lib/wow-icons';

	let { officers }: { officers: Officer[] } = $props();
</script>

<Section id="oficiales" eyebrow="Oficiales" title="El consejo de guerra">
	<div class="officers__grid">
		{#each officers as officer, i (officer.name)}
			{@const specIcon = specIconUrl(officer.wowClass, officer.spec)}
			{@const classIcon = classIconUrl(officer.wowClass)}
			{@const avatarIcon = specIcon ?? classIcon}
			<div
				use:reveal={{
					delay: i * 80,
					direction: i % 2 === 0 ? 'left' : 'right',
					blur: true
				}}
			>
				<div use:tilt={{ max: 5 }} class="officer-tilt">
					<Card class="officer">
						<div class="officer__row">
							{#if avatarIcon}
								<img
									class="officer__avatar officer__avatar--icon"
									src={avatarIcon}
									alt={(specIcon ? officer.spec : null) ??
										officer.classLabel ??
										officer.wowClass ??
										'Clase'}
									width="48"
									height="48"
									loading="lazy"
									decoding="async"
								/>
							{:else}
								<span class="officer__avatar" aria-hidden="true">{officer.name.charAt(0)}</span>
							{/if}

							<div class="officer__body">
								<h3 class="officer__name text-engraved">{officer.name}</h3>
								<p class="officer__role text-lava-glow">{officer.role}</p>
								{#if officer.classLabel}
									<p class="officer__class">{officer.classLabel}</p>
								{/if}
							</div>

							{#if officer.score != null}
								<span
									class="officer__parse"
									style="--parse-color: {parseColor(officer.score)}"
									title="Mejor parse medio en SSC/TK (WarcraftLogs)"
								>
									{officer.score}
								</span>
							{/if}
						</div>
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
		gap: 1.25rem;
	}
	.officer-tilt {
		height: 100%;
	}
	:global(.officer) {
		height: 100%;
		padding: 1.1rem 1.25rem;
	}
	/* Tidy row: avatar · identity · parse. No wrapping/clutter. */
	.officer__row {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		height: 100%;
	}

	.officer__avatar {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: 10px;
		font-family: var(--font-display);
		font-size: 1.4rem;
		font-weight: 900;
		color: var(--color-silver);
		background: linear-gradient(135deg, var(--color-crimson-deep), var(--color-blood));
		border: 1px solid color-mix(in srgb, var(--color-steel) 40%, transparent);
		box-shadow: inset 0 1px 0 rgba(229, 229, 229, 0.15);
	}
	.officer__avatar--icon {
		object-fit: cover;
		background: color-mix(in srgb, var(--color-stone) 75%, transparent);
	}

	.officer__body {
		min-width: 0;
		flex: 1;
	}
	.officer__name {
		font-size: 1.15rem;
		font-weight: 700;
		margin: 0;
		letter-spacing: 0.02em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.officer__role {
		font-family: var(--font-display);
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		margin: 0.15rem 0 0;
	}
	.officer__class {
		font-size: 0.78rem;
		letter-spacing: 0.06em;
		color: var(--color-steel-dim);
		margin: 0.1rem 0 0;
	}

	/* Parse badge: tier-colored pill (color via --parse-color inline). */
	.officer__parse {
		flex-shrink: 0;
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.1rem;
		padding: 0.18rem 0.45rem;
		border-radius: 999px;
		font-family: var(--font-display);
		font-size: 0.85rem;
		font-weight: 900;
		line-height: 1;
		color: var(--parse-color);
		background: color-mix(in srgb, var(--parse-color) 14%, transparent);
		border: 1px solid color-mix(in srgb, var(--parse-color) 55%, transparent);
		box-shadow: 0 0 10px color-mix(in srgb, var(--parse-color) 30%, transparent);
	}

	@media (min-width: 560px) {
		.officers__grid {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (min-width: 980px) {
		.officers__grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>
