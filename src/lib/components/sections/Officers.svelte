<script lang="ts">
	import Section from '$lib/components/layout/Section.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import ParseBadge from '$lib/components/ui/ParseBadge.svelte';
	import ClassSpecIcon from '$lib/components/ui/ClassSpecIcon.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { tilt } from '$lib/actions/tilt';
	import type { Officer } from '$lib/data/officers';
	import { parseTier } from '$lib/parse';
	import { specIconUrl, specOrClassIcon } from '$lib/wow-icons';

	let { officers }: { officers: Officer[] } = $props();
</script>

<Section id="oficiales" eyebrow="Oficiales" title="El consejo de guerra">
	<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
								<ClassSpecIcon
									src={avatarIcon}
									size={48}
									alt={(specIcon ? officer.spec : null) ??
										officer.classLabel ??
										officer.wowClass ??
										'Clase'}
									class="officer__avatar officer__avatar--icon"
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
		padding: var(--spacing-xl) var(--spacing-2xl);
	}
	/* Tidy row: avatar · identity · parse. No wrapping/clutter. */
	.officer__row {
		display: flex;
		align-items: center;
		gap: var(--spacing-lg);
		height: 100%;
	}

	/* :global — la variante --icon la lleva el <img> de ClassSpecIcon (hijo); la
	   base también estiliza el span de inicial (local). */
	:global(.officer__avatar) {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: var(--radius-lg);
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-weight: 900;
		color: var(--color-silver);
		background: linear-gradient(135deg, var(--color-crimson-deep), var(--color-blood));
		border: 1px solid color-mix(in srgb, var(--color-steel) 40%, transparent);
		box-shadow: inset 0 1px 0 rgba(229, 229, 229, 0.15);
	}
	:global(.officer__avatar--icon) {
		object-fit: cover;
		background: color-mix(in srgb, var(--color-stone) 75%, transparent);
	}

	.officer__body {
		min-width: 0;
		flex: 1;
	}
	.officer__name {
		font-size: var(--text-lg);
		font-weight: 700;
		margin: 0;
		letter-spacing: var(--tracking-snug);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.officer__role {
		font-size: var(--text-xs);
		margin: 0.15rem 0 0;
	}
	.officer__class {
		font-size: var(--text-xs);
		letter-spacing: var(--tracking-wide);
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
