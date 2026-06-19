<script lang="ts">
	import Section from '$lib/components/layout/Section.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { parseTier } from '$lib/parse';
	import { classIconUrl, specIconUrl } from '$lib/wow-icons';
	import type { HallOfFame, HallOfFameEntry } from '$lib/server/warcraftlogs';

	let { hallOfFame }: { hallOfFame: HallOfFame | null } = $props();

	type Column = { key: string; title: string; entries: HallOfFameEntry[] };

	const columns = $derived<Column[]>(
		hallOfFame
			? [
					{ key: 'dps', title: 'Top 10 DPS', entries: hallOfFame.dps },
					{ key: 'healers', title: 'Top 10 Sanadores', entries: hallOfFame.healers },
					{ key: 'tanks', title: 'Top 10 Tanques', entries: hallOfFame.tanks }
				]
			: []
	);

	// Only render columns that actually have entries.
	const visibleColumns = $derived(columns.filter((c) => c.entries.length > 0));
	const hasData = $derived(visibleColumns.length > 0);
</script>

{#if hasData}
	<Section id="salon-fama" eyebrow="Élite" title="Salón de la Fama">
		<p class="hof__intro" use:reveal>
			Los mejores parses de SSC y Tempest Keep entre todos nuestros cores, según
			WarcraftLogs.
		</p>
		<div class="hof__grid">
			{#each visibleColumns as col, ci (col.key)}
				<div use:reveal={{ delay: ci * 120, direction: 'up', blur: true }}>
					<Card class="hof-card">
						<h3 class="hof__title text-engraved">{col.title}</h3>
						<ol class="hof__list">
							{#each col.entries as entry, i (entry.name + entry.core)}
								{@const icon = specIconUrl(entry.wowClass, entry.spec) ?? classIconUrl(entry.wowClass)}
								{@const tier = parseTier(entry.score)}
								<li class="hof__row">
									<span class="hof__rank" class:is-top={i === 0}>{i + 1}</span>
									{#if icon}
										<span class="hof__icons" aria-hidden="false">
											<img
												class="hof__icon"
												src={icon}
												alt={entry.spec ?? entry.classLabel ?? entry.wowClass ?? 'Especialización'}
												width="20"
												height="20"
												loading="lazy"
												decoding="async"
											/>
										</span>
									{/if}
									<span class="hof__who">
										<span
											class="hof__name"
											title={entry.name}
											style={entry.classColor ? `color: ${entry.classColor}` : ''}
											>{entry.name}</span
										>
										<span class="hof__meta">
											{#if entry.classLabel}{entry.classLabel}{/if}
											{#if entry.classLabel && entry.core}<span class="hof__dot">·</span>{/if}
											{entry.core}
										</span>
									</span>
									<span
										class="hof__score"
										style="--parse-color: {tier.color}"
										title={`Parse ${entry.score} · ${tier.label}`}
										aria-label={`Parse ${entry.score} · ${tier.label}`}>{entry.score}</span
									>
								</li>
							{/each}
						</ol>
					</Card>
				</div>
			{/each}
		</div>
	</Section>
{/if}

<style>
	.hof__intro {
		text-align: center;
		max-width: 44rem;
		margin: -1rem auto 2.5rem;
		color: var(--color-steel);
		line-height: 1.6;
	}
	.hof__grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}
	:global(.hof-card) {
		height: 100%;
	}
	.hof__title {
		font-family: var(--font-display);
		font-size: 1.05rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		margin: 0 0 1.1rem;
		text-align: center;
		color: var(--color-silver);
	}
	.hof__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.hof__row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.45rem 0.55rem;
		border-radius: 4px;
		background: color-mix(in srgb, var(--color-stone) 60%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-steel) 14%, transparent);
	}
	.hof__rank {
		flex-shrink: 0;
		width: 1.7rem;
		text-align: center;
		font-family: var(--font-display);
		font-weight: 900;
		font-size: 0.95rem;
		color: var(--color-steel-dim);
	}
	.hof__rank.is-top {
		color: #e5cc80; /* gold for #1 */
		text-shadow: 0 0 8px rgba(229, 204, 128, 0.5);
	}
	.hof__icons {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
	}
	.hof__icon {
		width: 20px;
		height: 20px;
		border-radius: 4px;
		object-fit: cover;
		border: 1px solid color-mix(in srgb, var(--color-steel) 34%, transparent);
		box-shadow: inset 0 1px 0 rgba(229, 229, 229, 0.1);
		background: color-mix(in srgb, var(--color-stone) 70%, transparent);
	}
	.hof__who {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}
	.hof__name {
		font-weight: 700;
		letter-spacing: 0.02em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--color-silver);
	}
	.hof__meta {
		font-size: 0.72rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--color-steel-dim);
	}
	.hof__dot {
		margin: 0 0.3rem;
	}
	/* High-contrast number; tier color tints only the border/bg/glow. */
	.hof__score {
		flex-shrink: 0;
		min-width: 2.3rem;
		text-align: center;
		padding: 0.18rem 0.5rem;
		border-radius: 999px;
		font-family: var(--font-display);
		font-size: 0.9rem;
		font-weight: 900;
		line-height: 1;
		color: var(--color-silver);
		background: color-mix(in srgb, var(--parse-color) 18%, transparent);
		border: 1px solid color-mix(in srgb, var(--parse-color) 65%, transparent);
		box-shadow: 0 0 10px color-mix(in srgb, var(--parse-color) 28%, transparent);
	}

	@media (min-width: 720px) {
		.hof__grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>
