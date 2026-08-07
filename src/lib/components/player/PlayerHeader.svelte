<script lang="ts">
	import ClassSpecIcon from '$lib/components/ui/ClassSpecIcon.svelte';
	import { roleLabelEs } from '$lib/parse';
	import { rankText } from '$lib/playerFormat';
	import { wclCharacterUrl } from '$lib/data/teams';

	type Detail = {
		name: string;
		mainSpec: string | null;
		classLabel: string | null | undefined;
		role: 'DPS' | 'Healer' | 'Tank';
		bestAvg: number;
		median: number;
		bestRanks: { server: number | null; region: number | null; world: number | null };
	};
	type Tier = { color: string; label: string };
	type Standing = {
		inClass?: { rank: number; total: number } | null;
		overall?: { rank: number; total: number } | null;
	} | null;

	let {
		detail,
		headerIcon,
		nameColor,
		avgTier,
		standing,
		metricLabel
	}: {
		detail: Detail;
		headerIcon: string | null;
		nameColor: string | undefined;
		avgTier: Tier | null | undefined;
		standing: Standing;
		metricLabel: string | null;
	} = $props();
</script>

<header class="hero">
	<div class="hero__glow" aria-hidden="true"></div>
	<div class="hero__top">
		{#if headerIcon}
			<ClassSpecIcon
				src={headerIcon}
				size={72}
				loading="eager"
				alt={detail.mainSpec ?? detail.classLabel ?? 'Clase'}
				class="hero__icon"
			/>
		{:else}
			<span class="hero__icon hero__icon--letter" aria-hidden="true">{detail.name.charAt(0)}</span>
		{/if}

		<div class="hero__id">
			<h1 class="hero__name" style={nameColor ? `color: ${nameColor}` : ''}>
				{detail.name}
			</h1>
			<p class="hero__sub">
				{#if detail.mainSpec}<span class="hero__spec">{detail.mainSpec}</span>{/if}
				{#if detail.classLabel}
					<span class="hero__dot" aria-hidden="true">·</span>{detail.classLabel}{/if}
				<span class="hero__dot" aria-hidden="true">·</span>{roleLabelEs(detail.role)}
			</p>
		</div>
	</div>

	<!-- Parse medio + métricas destacadas -->
	<div class="stats">
		<div class="stat stat--hero" style="--parse-color: {avgTier?.color}">
			<span class="stat__value">{detail.bestAvg}</span>
			<span class="stat__label label-caps">
				Parse medio
				{#if avgTier}<span class="stat__tier">{avgTier.label}</span>{/if}
			</span>
		</div>
		<div class="stat">
			<span class="stat__value stat__value--muted">{detail.median}</span>
			<span class="stat__label label-caps">Mediana</span>
		</div>
		{#if metricLabel}
			<div class="stat">
				<span class="stat__value stat__value--metric">{metricLabel}</span>
				<span class="stat__label label-caps">Métrica</span>
			</div>
		{/if}
	</div>

	<!-- Mejores rankings: servidor / región / mundo -->
	<ul class="ranks" aria-label="Mejores clasificaciones">
		<li class="rank">
			<span class="rank__value">{rankText(detail.bestRanks.server)}</span>
			<span class="rank__label">Servidor</span>
		</li>
		<li class="rank">
			<span class="rank__value">{rankText(detail.bestRanks.region)}</span>
			<span class="rank__label">Región</span>
		</li>
		<li class="rank rank--world">
			<span class="rank__value">{rankText(detail.bestRanks.world)}</span>
			<span class="rank__label">Mundo</span>
		</li>
	</ul>

	<!-- Posición dentro de la hermandad (parse medio), calculada en el server -->
	{#if standing && (standing.inClass || standing.overall)}
		<p class="standing">
			{#if standing.inClass && detail.classLabel}
				<span class="standing__item">
					<strong>#{standing.inClass.rank}</strong>
					<span class="standing__of">de {standing.inClass.total} en {detail.classLabel}</span>
				</span>
			{/if}
			{#if standing.overall}
				<span class="standing__item">
					<strong>#{standing.overall.rank}</strong>
					<span class="standing__of">de {standing.overall.total} en la hermandad</span>
				</span>
			{/if}
		</p>
	{/if}

	<a
		class="wcl-btn label-caps"
		href={wclCharacterUrl(detail.name)}
		target="_blank"
		rel="noopener noreferrer"
	>
		Ver en WarcraftLogs <span class="wcl-btn__arrow" aria-hidden="true">↗</span>
	</a>
</header>

<style>
	.hero {
		position: relative;
		overflow: hidden;
		margin-top: var(--spacing-3xl);
		padding: clamp(1.5rem, 4vw, 2.25rem);
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--color-stone) 72%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-steel) 18%, transparent);
		box-shadow:
			inset 0 1px 0 rgba(229, 229, 229, 0.05),
			0 2px 14px rgba(0, 0, 0, 0.5);
	}
	.hero__glow {
		position: absolute;
		top: -40%;
		right: -10%;
		width: 60%;
		height: 140%;
		pointer-events: none;
		background: radial-gradient(ellipse at center, rgba(255, 59, 33, 0.1), transparent 65%);
	}
	.hero__top {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--spacing-xl);
		flex-wrap: wrap;
	}
	/* :global — el <img> lo renderiza ClassSpecIcon (hijo); el span de inicial
	   (.hero__icon--letter, local) también hereda esta base. */
	:global(.hero__icon) {
		flex-shrink: 0;
		width: 72px;
		height: 72px;
		border-radius: var(--radius-xl);
		object-fit: cover;
		border: 1px solid color-mix(in srgb, var(--color-steel) 38%, transparent);
		box-shadow:
			inset 0 1px 0 rgba(229, 229, 229, 0.12),
			0 0 16px rgba(255, 59, 33, 0.18);
		background: color-mix(in srgb, var(--color-stone) 80%, transparent);
	}
	.hero__icon--letter {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-display);
		font-size: 2rem;
		font-weight: 900;
		color: var(--color-silver);
		background: linear-gradient(135deg, var(--color-crimson-deep), var(--color-blood));
	}
	.hero__id {
		min-width: 0;
	}
	.hero__name {
		font-family: var(--font-display);
		font-size: clamp(1.9rem, 7vw, 3rem);
		font-weight: 900;
		letter-spacing: var(--tracking-snug);
		line-height: 1.05;
		margin: 0;
		color: var(--color-silver);
		text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
		word-break: break-word;
	}
	.hero__sub {
		margin: var(--spacing-2xs) 0 0;
		font-family: var(--font-display);
		font-size: var(--text-sm);
		font-weight: 700;
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		color: var(--color-steel-dim);
	}
	.hero__spec {
		color: var(--color-ember);
	}
	.hero__dot {
		margin: 0 var(--spacing-2xs);
		color: color-mix(in srgb, var(--color-steel) 50%, transparent);
	}

	/* Estadísticas destacadas */
	.stats {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-md);
		margin-top: var(--spacing-3xl);
	}
	.stat {
		flex: 1 1 6rem;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3xs);
		padding: var(--spacing-lg) var(--spacing-xl);
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--color-ash) 50%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-steel) 14%, transparent);
	}
	.stat--hero {
		flex: 1 1 9rem;
		background: color-mix(in srgb, var(--parse-color) 14%, transparent);
		border-color: color-mix(in srgb, var(--parse-color) 55%, transparent);
		box-shadow: 0 0 18px color-mix(in srgb, var(--parse-color) 22%, transparent);
	}
	.stat__value {
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 6vw, 2.6rem);
		font-weight: 900;
		line-height: 1;
		color: var(--color-silver);
	}
	.stat--hero .stat__value {
		text-shadow: 0 0 14px color-mix(in srgb, var(--parse-color) 60%, transparent);
	}
	.stat__value--muted {
		color: var(--color-steel);
	}
	.stat__value--metric {
		font-size: clamp(1.3rem, 4vw, 1.7rem);
		color: var(--color-ember);
		letter-spacing: var(--tracking-heading);
	}
	.stat__label {
		font-size: var(--text-2xs);
		color: var(--color-steel-dim);
		display: flex;
		align-items: center;
		gap: var(--spacing-2xs);
		flex-wrap: wrap;
	}
	.stat__tier {
		color: var(--parse-color);
		font-weight: 900;
	}

	/* Rankings servidor / región / mundo */
	.ranks {
		position: relative;
		list-style: none;
		margin: var(--spacing-lg) 0 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--spacing-md);
	}
	.rank {
		text-align: center;
		padding: var(--spacing-md) var(--spacing-xs);
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--color-iron) 60%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-steel) 14%, transparent);
	}
	.rank--world {
		border-color: color-mix(in srgb, var(--color-lava) 35%, transparent);
		box-shadow: inset 0 0 18px rgba(255, 59, 33, 0.07);
	}
	.rank__value {
		display: block;
		font-family: var(--font-display);
		font-size: clamp(1rem, 3.5vw, 1.4rem);
		font-weight: 900;
		color: var(--color-silver);
		letter-spacing: var(--tracking-snug);
	}
	.rank--world .rank__value {
		color: var(--color-ember);
	}
	.rank__label {
		display: block;
		margin-top: var(--spacing-3xs);
		font-size: var(--text-2xs);
		font-weight: 700;
		letter-spacing: var(--tracking-caps);
		text-transform: uppercase;
		color: var(--color-steel-dim);
	}

	/* Posición en la hermandad */
	.standing {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-2xs) var(--spacing-xl);
		margin: var(--spacing-lg) 0 0;
		font-size: var(--text-sm);
		color: var(--color-steel-dim);
	}
	.standing__item strong {
		color: var(--color-gold, #e5cc80);
		font-weight: 800;
		margin-right: var(--spacing-3xs);
	}
	.standing__of {
		color: var(--color-steel-dim);
	}
</style>
