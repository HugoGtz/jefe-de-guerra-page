<script lang="ts">
	import Section from '$lib/components/layout/Section.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import ParseBadge from '$lib/components/ui/ParseBadge.svelte';
	import ClassSpecIcon from '$lib/components/ui/ClassSpecIcon.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { parseTier } from '$lib/parse';
	import { specOrClassIcon, playerHref } from '$lib/wow-icons';
	import type { HallOfFame } from '$lib/server/wcl';
	import type { WclExtras } from '$lib/server/data';

	let { wclExtras }: { wclExtras: Promise<WclExtras> } = $props();

	// The section (and its #salon-fama anchor, linked from the navbar) always
	// mounts. Streamed in after the rest of the page: starts null/loading
	// until wclExtras resolves, so the anchor is never dead and nothing
	// pops in below the fold once it does.
	let hallOfFame = $state<HallOfFame | null>(null);
	let byClass = $state<Record<string, Row[]> | null>(null);
	let byBoss = $state<Record<string, Row[]> | null>(null);
	let loading = $state(true);
	$effect(() => {
		wclExtras.then((extras) => {
			hallOfFame = extras.hallOfFame;
			byClass = extras.byClass;
			byBoss = extras.byBoss;
			loading = false;
		});
	});

	/** Minimal shape shared by HallOfFameEntry / WclCharacter / BossLeaderEntry —
	    everything the row markup below actually reads. `core` is absent on the
	    per-class leaderboard (not tracked per-core in the accumulator). */
	type Row = {
		name: string;
		wowClass?: string;
		classLabel?: string;
		classColor?: string;
		spec?: string;
		core?: string;
		score?: number;
	};
	type Column = { key: string; title: string; entries: Row[] };

	type View = 'role' | 'boss' | 'class';
	let view = $state<View>('role');
	const views: { key: View; label: string }[] = [
		{ key: 'role', label: 'Por rol' },
		{ key: 'boss', label: 'Por jefe' },
		{ key: 'class', label: 'Por clase' }
	];

	// Canonical SSC → TK order so "Por jefe" reads top-to-bottom like the raid
	// progress section, instead of whatever order the accumulator happened to
	// see fights in.
	const BOSS_ORDER = [
		'Hydross the Unstable',
		'The Lurker Below',
		'Leotheras the Blind',
		'Fathom-Lord Karathress',
		'Morogrim Tidewalker',
		'Lady Vashj',
		"Al'ar",
		'Void Reaver',
		'High Astromancer Solarian',
		"Kael'thas Sunstrider"
	];

	const roleColumns = $derived<Column[]>(
		hallOfFame
			? [
					{ key: 'dps', title: 'Top 10 DPS', entries: hallOfFame.dps },
					{ key: 'healers', title: 'Top 10 Sanadores', entries: hallOfFame.healers },
					{ key: 'tanks', title: 'Top 10 Tanques', entries: hallOfFame.tanks }
				]
			: []
	);

	const bossColumns = $derived<Column[]>(
		byBoss
			? BOSS_ORDER.filter((boss) => byBoss![boss]?.length).map((boss) => ({
					key: boss,
					title: boss,
					entries: byBoss![boss]
				}))
			: []
	);

	const classColumns = $derived<Column[]>(
		byClass
			? Object.entries(byClass)
					.filter(([, entries]) => entries.length > 0)
					.map(([cls, entries]) => ({
						key: cls,
						title: entries[0]?.classLabel ?? cls,
						entries
					}))
					.sort((a, b) => a.title.localeCompare(b.title, 'es'))
			: []
	);

	const columns = $derived<Column[]>(
		view === 'boss' ? bossColumns : view === 'class' ? classColumns : roleColumns
	);

	// Only render columns that actually have entries.
	const visibleColumns = $derived(columns.filter((c) => c.entries.length > 0));
	const hasData = $derived(visibleColumns.length > 0);
	// Whether ANY tab has data — independent of the currently selected `view` —
	// so switching to an empty tab (e.g. "Por jefe" before WCL has boss data)
	// doesn't make the tab bar itself disappear.
	const hasAnyData = $derived(
		roleColumns.some((c) => c.entries.length > 0) ||
			bossColumns.some((c) => c.entries.length > 0) ||
			classColumns.some((c) => c.entries.length > 0)
	);
</script>

<Section id="salon-fama" eyebrow="Élite" title="Salón de la Fama">
	<p class="hof__intro" use:reveal>
		Los mejores parses de SSC y Tempest Keep entre todos nuestros cores, según WarcraftLogs.
	</p>
	{#if !loading && hasAnyData}
		<div class="hof__tabs" role="tablist" aria-label="Ver Salón de la Fama" use:reveal>
			{#each views as v (v.key)}
				<button
					type="button"
					role="tab"
					aria-selected={view === v.key}
					class="hof__tab"
					class:is-active={view === v.key}
					onclick={() => (view = v.key)}
				>
					{v.label}
				</button>
			{/each}
		</div>
	{/if}
	{#if loading}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-3" aria-hidden="true">
			{#each { length: 3 } as _, ci (ci)}
				<Card class="hof-card">
					<div class="hof__skeleton-title"></div>
					<ol class="hof__list">
						{#each { length: 5 } as _, ri (ri)}
							<li class="hof__row hof__row--skeleton">
								<span class="hof__skeleton-rank"></span>
								<span class="hof__skeleton-line"></span>
							</li>
						{/each}
					</ol>
				</Card>
			{/each}
		</div>
	{:else if hasData}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
			{#each visibleColumns as col, ci (col.key)}
				<div use:reveal={{ delay: ci * 120, direction: 'up', blur: true }}>
					<Card class="hof-card">
						<h3 class="hof__title text-engraved">{col.title}</h3>
						<ol class="hof__list">
							{#each col.entries as entry, i (entry.name + (entry.core ?? ''))}
								{@const icon = specOrClassIcon(entry.wowClass, entry.spec)}
								{@const score = entry.score ?? 0}
								{@const tier = parseTier(score)}
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
											{score}
											size="md"
											title={`Parse ${score} · ${tier.label}`}
											ariaLabel={`Parse ${score} · ${tier.label}`}
										/>
									</a>
								</li>
							{/each}
						</ol>
					</Card>
				</div>
			{/each}
		</div>
	{:else if hasAnyData}
		<p class="hof__empty">Aún no hay suficientes datos de WarcraftLogs para esta vista.</p>
	{:else}
		<p class="hof__empty">
			Aún no hay suficientes datos de WarcraftLogs para mostrar el salón de la fama.
		</p>
	{/if}
</Section>

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
	.hof__tabs {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
		margin: 0 0 var(--spacing-2xl);
	}
	.hof__tab {
		font-family: var(--font-display);
		font-size: var(--text-xs);
		font-weight: 700;
		letter-spacing: var(--tracking-caps);
		text-transform: uppercase;
		color: var(--color-steel-dim);
		background: color-mix(in srgb, var(--color-stone) 70%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-steel) 22%, transparent);
		border-radius: var(--radius-full);
		padding: var(--spacing-2xs) var(--spacing-xl);
		cursor: pointer;
		transition:
			color 0.18s ease,
			border-color 0.18s ease,
			background-color 0.18s ease;
	}
	.hof__tab:hover {
		color: var(--color-silver);
		border-color: color-mix(in srgb, var(--color-lava) 45%, transparent);
	}
	.hof__tab:focus-visible {
		outline: 2px solid var(--color-lava);
		outline-offset: 2px;
	}
	.hof__tab.is-active {
		color: var(--color-ash);
		background: linear-gradient(135deg, var(--color-ember), var(--color-lava));
		border-color: transparent;
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
	.hof__empty {
		text-align: center;
		color: var(--color-steel-dim);
		padding: var(--spacing-2xl) 0;
	}
	.hof__skeleton-title {
		height: var(--text-md);
		width: 60%;
		margin: 0 auto var(--spacing-xl);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--color-steel) 18%, transparent);
	}
	.hof__row--skeleton {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-2xs) var(--spacing-xs);
	}
	.hof__skeleton-rank {
		flex-shrink: 0;
		width: 1.7rem;
		height: 1rem;
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--color-steel) 18%, transparent);
	}
	.hof__skeleton-line {
		flex: 1;
		height: 1rem;
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--color-steel) 18%, transparent);
	}
	.hof__skeleton-title,
	.hof__skeleton-rank,
	.hof__skeleton-line {
		animation: hof-skeleton-pulse 1.4s ease-in-out infinite;
	}
	@keyframes hof-skeleton-pulse {
		0%,
		100% {
			opacity: 0.5;
		}
		50% {
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.hof__skeleton-title,
		.hof__skeleton-rank,
		.hof__skeleton-line {
			animation: none;
		}
	}
</style>
