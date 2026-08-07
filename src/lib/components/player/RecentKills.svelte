<script lang="ts">
	import ParseBadge from '$lib/components/ui/ParseBadge.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { parseTier } from '$lib/parse';
	import { bossIconUrl } from '$lib/wow-icons';
	import { dateText } from '$lib/playerFormat';

	type Kill = { boss: string; date: string; core: string; parse: number | null };

	let { recent, playerName }: { recent: Kill[]; playerName: string } = $props();
</script>

{#if recent.length > 0}
	<ul class="history">
		{#each recent as kill, i (kill.boss + kill.date + i)}
			{@const tier = kill.parse != null ? parseTier(kill.parse) : null}
			<li class="history__item" use:reveal={{ delay: Math.min(i * 35, 320) }}>
				<img
					class="history__icon"
					src={bossIconUrl(kill.boss)}
					alt=""
					width="32"
					height="32"
					loading="lazy"
					decoding="async"
				/>
				<span class="history__body">
					<span class="history__boss">{kill.boss}</span>
					<span class="history__meta">
						{dateText(kill.date)}<span class="history__dot" aria-hidden="true">·</span>{kill.core}
					</span>
				</span>
				{#if kill.parse != null && tier}
					<ParseBadge
						score={kill.parse}
						title={`Parse ${kill.parse} · ${tier.label}`}
						ariaLabel={`Parse ${kill.parse}, ${tier.label}`}
					/>
				{:else}
					<span class="dash" aria-label="Sin parse">—</span>
				{/if}
			</li>
		{/each}
	</ul>
{:else}
	<p class="history__empty">
		Todavía no hay kills recientes registrados para {playerName} en los logs de SSC y Tempest Keep.
	</p>
{/if}

<style>
	.history {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--spacing-xs);
	}
	.history__item {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-sm) var(--spacing-lg);
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--color-stone) 55%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-steel) 12%, transparent);
		transition:
			border-color 0.18s ease,
			background-color 0.18s ease;
	}
	.history__item:hover {
		border-color: color-mix(in srgb, var(--color-lava) 40%, transparent);
		background: color-mix(in srgb, var(--color-stone) 80%, transparent);
	}
	.history__icon {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-md);
		object-fit: cover;
		border: 1px solid color-mix(in srgb, var(--color-steel) 28%, transparent);
	}
	.history__body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.history__boss {
		font-weight: 600;
		font-size: var(--text-base);
		color: var(--color-silver);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.history__meta {
		font-size: var(--text-xs);
		letter-spacing: var(--tracking-heading);
		text-transform: uppercase;
		color: var(--color-steel-dim);
	}
	.history__dot {
		margin: 0 var(--spacing-2xs);
		color: color-mix(in srgb, var(--color-steel) 50%, transparent);
	}
	.dash {
		color: var(--color-steel-dim);
	}
	.history__empty {
		padding: clamp(1.5rem, 4vw, 2.25rem);
		text-align: center;
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--color-stone) 50%, transparent);
		border: 1px dashed color-mix(in srgb, var(--color-steel) 22%, transparent);
		color: var(--color-steel-dim);
		font-size: var(--text-sm);
		line-height: 1.6;
		margin: 0;
	}

	@media (min-width: 600px) {
		.history {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
