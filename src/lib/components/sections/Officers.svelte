<script lang="ts">
	import Section from '$lib/components/layout/Section.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import ParseBadge from '$lib/components/ui/ParseBadge.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { tilt } from '$lib/actions/tilt';
	import type { Officer } from '$lib/data/officers';
	import { parseTier } from '$lib/parse';
	import { specIconUrl, specOrClassIcon } from '$lib/wow-icons';

	let { officers }: { officers: Officer[] } = $props();
</script>

<Section id="oficiales" eyebrow="Oficiales" title="El consejo de guerra">
	<div class="grid grid-cols-1 gap-5 min-[560px]:grid-cols-2 min-[980px]:grid-cols-3">
		{#each officers as officer, i (officer.name)}
			{@const specIcon = specIconUrl(officer.wowClass, officer.spec)}
			{@const avatarIcon = specOrClassIcon(officer.wowClass, officer.spec)}
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
								<h3 class="officer__name text-engraved" title={officer.name}>{officer.name}</h3>
								<p class="officer__role label-caps text-lava-glow">{officer.role}</p>
								{#if officer.classLabel}
									<p class="officer__class">{officer.classLabel}</p>
								{/if}
							</div>

							{#if officer.score != null}
								{@const tier = parseTier(officer.score)}
								<span class="officer__parse-wrap">
									<ParseBadge
										score={officer.score}
										title={`Parse ${officer.score} · ${tier.label} — mejor parse medio en SSC/TK (WarcraftLogs)`}
										ariaLabel={`Parse ${officer.score} · ${tier.label}`}
									/>
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
		font-size: 0.74rem;
		margin: 0.15rem 0 0;
	}
	.officer__class {
		font-size: 0.78rem;
		letter-spacing: 0.06em;
		color: var(--color-steel-dim);
		margin: 0.1rem 0 0;
	}

	/* Keeps the shared ParseBadge pinned to the top of the flex row. */
	.officer__parse-wrap {
		flex-shrink: 0;
		align-self: flex-start;
		display: inline-flex;
	}
</style>
