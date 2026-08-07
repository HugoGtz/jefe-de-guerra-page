<script lang="ts">
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import StatusPill from '$lib/components/ui/StatusPill.svelte';
	import { wclGuildUrl, wclCalendarUrl } from '$lib/data/teams';
	import { formatDuration } from '$lib/parse';

	type RaidProgress = { kills: number; total: number; percent?: number };
	type Team = {
		name: string;
		recruiting: boolean;
		schedule: { days: string; time?: string; timezone: string };
		note?: string;
		ssc: RaidProgress;
		tk: RaidProgress;
		wclGuildId?: number;
		activity?: {
			raids: number;
			totalKills: number;
			lastRaid: string | null;
			fastestByBoss: Record<string, number>;
		};
	};

	let { team }: { team: Team } = $props();

	const pct = (p: RaidProgress): number => p.percent ?? 0;

	const MONTHS_ES = [
		'ene',
		'feb',
		'mar',
		'abr',
		'may',
		'jun',
		'jul',
		'ago',
		'sep',
		'oct',
		'nov',
		'dic'
	];

	/** Formatea 'yyyy-mm-dd' como "12 jun". */
	function formatShortDate(iso: string): string {
		const [, m, d] = iso.split('-').map(Number);
		if (!m || !d) return iso;
		return `${d} ${MONTHS_ES[m - 1] ?? ''}`;
	}

	/** El récord de velocidad más rápido entre todos los bosses del core, o null. */
	const speedRecord = $derived.by(() => {
		const byBoss = team.activity?.fastestByBoss;
		if (!byBoss) return null;
		let best: { boss: string; ms: number } | null = null;
		for (const [boss, ms] of Object.entries(byBoss)) {
			if (!best || ms < best.ms) best = { boss, ms };
		}
		return best;
	});
</script>

<header class="core__head">
	<div class="core__title-row">
		<h1 class="core__name text-engraved">{team.name}</h1>
		<StatusPill open={team.recruiting} />
	</div>

	<p class="core__schedule">
		<span class="core__days">{team.schedule.days}</span>
		{#if team.schedule.time}
			<span class="core__sep" aria-hidden="true">·</span>
			<span class="core__time">{team.schedule.time}</span>
			<span class="core__tz">{team.schedule.timezone}</span>
		{/if}
	</p>

	{#if team.note}
		<p class="core__note">{team.note}</p>
	{/if}

	<div class="core__bars">
		<ProgressBar
			value={pct(team.ssc)}
			label={`SSC ${team.ssc.kills}/${team.ssc.total}`}
			complete={team.ssc.kills >= team.ssc.total}
		/>
		<ProgressBar
			value={pct(team.tk)}
			label={`TK ${team.tk.kills}/${team.tk.total}`}
			complete={team.tk.kills >= team.tk.total}
		/>
	</div>

	{#if team.activity && team.activity.raids > 0}
		<div class="core__activity">
			<div class="core__stat">
				<span class="core__stat-value">{team.activity.raids}</span>
				<span class="core__stat-label">Noches de raid</span>
			</div>
			<div class="core__stat">
				<span class="core__stat-value">{team.activity.totalKills}</span>
				<span class="core__stat-label">Kills registrados</span>
			</div>
			{#if team.activity.lastRaid}
				<div class="core__stat">
					<span class="core__stat-value">{formatShortDate(team.activity.lastRaid)}</span>
					<span class="core__stat-label">Última raid</span>
				</div>
			{/if}
			{#if speedRecord}
				{@const time = formatDuration(speedRecord.ms)}
				{#if time}
					<div class="core__stat">
						<span class="core__stat-value">{time}</span>
						<span class="core__stat-label">Récord · {speedRecord.boss}</span>
					</div>
				{/if}
			{/if}
		</div>
	{/if}

	{#if team.wclGuildId}
		<div class="core__links">
			<a
				class="core__logs label-caps"
				href={wclGuildUrl(team.wclGuildId)}
				target="_blank"
				rel="noopener noreferrer"
			>
				Logs <span class="core__logs-arrow" aria-hidden="true">↗</span>
			</a>
			<a
				class="core__logs label-caps"
				href={wclCalendarUrl(team.wclGuildId)}
				target="_blank"
				rel="noopener noreferrer"
			>
				Calendario <span class="core__logs-arrow" aria-hidden="true">↗</span>
			</a>
		</div>
	{/if}
</header>

<style>
	.core__head {
		margin-top: var(--spacing-3xl);
		padding: clamp(1.25rem, 3vw, 1.75rem);
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--color-stone) 70%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-steel) 16%, transparent);
	}
	.core__title-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--spacing-lg);
		margin-bottom: var(--spacing-sm);
	}
	.core__name {
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 6vw, 2.6rem);
		font-weight: 900;
		letter-spacing: var(--tracking-snug);
		margin: 0;
	}

	.core__schedule {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: var(--spacing-2xs);
		margin: 0 0 var(--spacing-xl);
		font-size: var(--text-base);
		color: var(--color-steel-dim);
	}
	.core__days {
		font-family: var(--font-display);
		font-weight: 700;
		letter-spacing: var(--tracking-heading);
		color: var(--color-steel);
	}
	.core__sep {
		color: var(--color-ember);
	}
	.core__time {
		font-family: var(--font-display);
		font-weight: 700;
		color: var(--color-ember);
	}
	.core__tz {
		font-size: var(--text-xs);
		font-weight: 700;
		letter-spacing: var(--tracking-eyebrow);
		text-transform: uppercase;
		color: var(--color-ash);
		background-color: var(--color-steel);
		padding: 0.08rem var(--spacing-2xs);
		border-radius: var(--radius-sm);
		align-self: center;
	}
	.core__note {
		margin: 0 0 var(--spacing-2xl);
		font-size: var(--text-sm);
		line-height: 1.5;
		color: var(--color-steel-dim);
	}
	.core__bars {
		display: grid;
		gap: var(--spacing-lg);
		max-width: 32rem;
	}

	.core__activity {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-2xl);
		margin-top: var(--spacing-2xl);
		padding-top: var(--spacing-xl);
		border-top: 1px solid color-mix(in srgb, var(--color-steel) 14%, transparent);
	}
	.core__stat {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3xs);
	}
	.core__stat-value {
		font-family: var(--font-display);
		font-weight: 900;
		font-size: var(--text-lg);
		color: var(--color-ember);
		font-variant-numeric: tabular-nums;
	}
	.core__stat-label {
		font-size: var(--text-xs);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		color: var(--color-steel-dim);
	}

	.core__links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-2xl);
		margin-top: var(--spacing-2xl);
	}
	.core__logs {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-3xs);
		font-size: var(--text-xs);
		text-decoration: none;
		color: var(--color-steel);
		border-bottom: 1px solid color-mix(in srgb, var(--color-steel) 35%, transparent);
		transition:
			color 0.2s ease,
			border-color 0.2s ease,
			transform 0.2s ease;
	}
	.core__logs:hover {
		color: var(--color-ember);
		border-color: color-mix(in srgb, var(--color-lava) 60%, transparent);
		transform: translateY(-1px);
	}
	.core__logs:focus-visible {
		outline: 2px solid var(--color-lava);
		outline-offset: 2px;
	}
	.core__logs-arrow {
		font-size: 0.85em;
		transition: transform 0.2s ease;
	}
	.core__logs:hover .core__logs-arrow {
		transform: translate(1px, -1px);
	}

	@media (prefers-reduced-motion: reduce) {
		.core__logs:hover,
		.core__logs:hover .core__logs-arrow {
			transform: none;
		}
	}
</style>
