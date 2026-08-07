<script lang="ts">
	import ParseBadge from '$lib/components/ui/ParseBadge.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { parseTier, formatDuration } from '$lib/parse';
	import { bossIconUrl } from '$lib/wow-icons';
	import { amountText } from '$lib/playerFormat';

	type BossRow = {
		encounterName: string;
		best: number | null;
		kills: number;
		amount: number | null;
		ilvl: number | null;
		fastestKillMs: number | null;
	};

	let { bosses, metricLabel }: { bosses: BossRow[]; metricLabel: string | null } = $props();
</script>

<div class="bosses" role="table" aria-label="Parses por boss en SSC y Tempest Keep">
	<div class="bosses__header" role="row">
		<span role="columnheader">Boss</span>
		<span role="columnheader" class="col-num">Mejor</span>
		<span role="columnheader" class="col-num col-hide-sm">Kills</span>
		<span role="columnheader" class="col-num">{metricLabel ?? 'Cant.'}</span>
		<span role="columnheader" class="col-num col-hide-sm">iLvl</span>
		<span role="columnheader" class="col-num col-hide-sm">Más rápido</span>
	</div>
	{#each bosses as boss, i (boss.encounterName)}
		{@const tier = boss.best != null ? parseTier(boss.best) : null}
		{@const fastest = formatDuration(boss.fastestKillMs)}
		<div class="bosses__row" role="row" use:reveal={{ delay: Math.min(i * 40, 320) }}>
			<span class="boss-name" role="cell">
				<img
					class="boss-name__icon"
					src={bossIconUrl(boss.encounterName)}
					alt=""
					width="28"
					height="28"
					loading="lazy"
					decoding="async"
				/>
				<span class="boss-name__text">{boss.encounterName}</span>
			</span>
			<span class="col-num" role="cell">
				{#if boss.best != null && tier}
					<ParseBadge
						score={boss.best}
						title={`Parse ${boss.best} · ${tier.label}`}
						ariaLabel={`Parse ${boss.best}, ${tier.label}`}
					/>
				{:else}
					<span class="dash" aria-label="Sin parse">—</span>
				{/if}
			</span>
			<span class="col-num col-hide-sm boss-kills" role="cell">{boss.kills}</span>
			<span class="col-num boss-amount" role="cell">{amountText(boss.amount)}</span>
			<span class="col-num col-hide-sm boss-ilvl" role="cell">{boss.ilvl ?? '—'}</span>
			<span class="col-num col-hide-sm boss-fastest" role="cell">{fastest ?? '—'}</span>
		</div>
	{/each}
</div>

<style>
	.bosses {
		border-radius: var(--radius-lg);
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--color-steel) 14%, transparent);
	}
	.bosses__header,
	.bosses__row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 3.4rem;
		align-items: center;
		gap: var(--spacing-xs);
		padding: var(--spacing-sm) var(--spacing-lg);
	}
	.bosses__header {
		font-family: var(--font-display);
		font-size: var(--text-2xs);
		font-weight: 700;
		letter-spacing: var(--tracking-eyebrow);
		text-transform: uppercase;
		color: var(--color-steel-dim);
		background: color-mix(in srgb, var(--color-iron) 70%, transparent);
	}
	.bosses__row {
		background: color-mix(in srgb, var(--color-stone) 55%, transparent);
		border-top: 1px solid color-mix(in srgb, var(--color-steel) 10%, transparent);
		transition: background-color 0.18s ease;
	}
	.bosses__row:hover {
		background: color-mix(in srgb, var(--color-stone) 85%, transparent);
	}
	.col-num {
		text-align: center;
		font-variant-numeric: tabular-nums;
	}
	/* Columnas extra ocultas en móvil para evitar overflow. */
	.col-hide-sm {
		display: none;
	}
	.boss-name {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		min-width: 0;
	}
	.boss-name__icon {
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-md);
		object-fit: cover;
		border: 1px solid color-mix(in srgb, var(--color-steel) 28%, transparent);
	}
	.boss-name__text {
		font-weight: 600;
		font-size: var(--text-sm);
		color: var(--color-silver);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.boss-kills,
	.boss-ilvl,
	.boss-fastest,
	.boss-amount {
		font-size: var(--text-sm);
		color: var(--color-steel);
	}
	.dash {
		color: var(--color-steel-dim);
	}

	@media (min-width: 600px) {
		.col-hide-sm {
			display: block;
		}
		.bosses__header,
		.bosses__row {
			grid-template-columns: minmax(0, 1fr) 3.4rem 3rem 4.2rem 3rem 4.6rem;
		}
	}
</style>
