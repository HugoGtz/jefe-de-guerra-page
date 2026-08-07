<script lang="ts">
	import Section from '$lib/components/layout/Section.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import ParseBadge from '$lib/components/ui/ParseBadge.svelte';
	import ClassSpecIcon from '$lib/components/ui/ClassSpecIcon.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { parseTier } from '$lib/parse';
	import { specOrClassIcon, playerHref } from '$lib/wow-icons';
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
			Los mejores parses de SSC y Tempest Keep entre todos nuestros cores, según WarcraftLogs.
		</p>
		<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
			{#each visibleColumns as col, ci (col.key)}
				<div use:reveal={{ delay: ci * 120, direction: 'up', blur: true }}>
					<Card class="hof-card">
						<h3 class="hof__title text-engraved">{col.title}</h3>
						<ol class="hof__list">
							{#each col.entries as entry, i (entry.name + entry.core)}
								{@const icon = specOrClassIcon(entry.wowClass, entry.spec)}
								{@const tier = parseTier(entry.score)}
								<li>
									<a
										class="hof__row"
										href={playerHref(entry.name)}
										aria-label={`Ver los parses de ${entry.name}`}
									>
										<span class="hof__rank" class:is-top={i === 0}>{i + 1}</span>
										{#if icon}
											<span class="hof__icons" aria-hidden="false">
												<ClassSpecIcon
													src={icon}
													size={20}
													alt={entry.spec ??
														entry.classLabel ??
														entry.wowClass ??
														'Especialización'}
													class="hof__icon"
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
										<ParseBadge
											score={entry.score}
											size="md"
											title={`Parse ${entry.score} · ${tier.label}`}
											ariaLabel={`Parse ${entry.score} · ${tier.label}`}
										/>
									</a>
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
		margin: -1rem auto var(--spacing-4xl);
		color: var(--color-steel);
		line-height: 1.6;
	}
	:global(.hof-card) {
		height: 100%;
	}
	.hof__title {
		font-family: var(--font-display);
		font-size: var(--text-md);
		font-weight: 900;
		letter-spacing: var(--tracking-eyebrow);
		text-transform: uppercase;
		margin: 0 0 var(--spacing-xl);
		text-align: center;
		color: var(--color-silver);
	}
	.hof__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}
	.hof__row {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-2xs) var(--spacing-xs);
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--color-stone) 60%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-steel) 14%, transparent);
		/* Cada fila enlaza al perfil del jugador en WarcraftLogs. */
		text-decoration: none;
		color: inherit;
		transition:
			border-color 0.18s ease,
			background-color 0.18s ease,
			transform 0.18s ease;
	}
	.hof__row:hover {
		border-color: color-mix(in srgb, var(--color-lava) 55%, transparent);
		background: color-mix(in srgb, var(--color-stone) 80%, transparent);
		transform: translateY(-1px);
	}
	.hof__row:focus-visible {
		outline: 2px solid var(--color-lava);
		outline-offset: 2px;
	}
	@media (prefers-reduced-motion: reduce) {
		.hof__row:hover {
			transform: none;
		}
	}
	.hof__rank {
		flex-shrink: 0;
		width: 1.7rem;
		text-align: center;
		font-family: var(--font-display);
		font-weight: 900;
		font-size: var(--text-base);
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
	/* :global — se aplica al <img> renderizado por ClassSpecIcon (componente hijo). */
	:global(.hof__icon) {
		width: 20px;
		height: 20px;
		border-radius: var(--radius-md);
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
		letter-spacing: var(--tracking-snug);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--color-silver);
	}
	.hof__meta {
		font-size: var(--text-xs);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		color: var(--color-steel-dim);
	}
	.hof__dot {
		margin: 0 var(--spacing-3xs);
	}
</style>
