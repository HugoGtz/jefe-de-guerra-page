<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { parseTier, roleLabelEs, formatDuration } from '$lib/parse';
	import { classIconUrl, specIconUrl, bossIconUrl } from '$lib/wow-icons';
	import { wclCharacterUrl } from '$lib/data/teams';

	// SSR (+page.server.ts): the requested name, the character detail (null when
	// there are no logs) and the recent-kills histórico (possibly empty).
	let { data } = $props();

	const name = $derived(data.name);
	const detail = $derived(data.detail);
	const recent = $derived(data.recent ?? []);
	const hasDetail = $derived(!!detail);

	/** Métrica en mayúsculas para mostrar (DPS / HPS), con respaldo a "Parse". */
	const metricLabel = $derived(detail?.metric ? detail.metric.toUpperCase() : null);

	/** Icono cabecera: spec → clase → null (respaldo a inicial). */
	const headerIcon = $derived(
		detail
			? (specIconUrl(detail.wowClass, detail.mainSpec ?? undefined) ?? classIconUrl(detail.wowClass))
			: null
	);

	/** Color de clase para teñir el nombre. */
	const nameColor = $derived(detail?.classColor ?? undefined);

	/** Tier del parse medio (para teñir badge/glow). */
	const avgTier = $derived(detail ? parseTier(detail.bestAvg) : null);

	/** Formatea un rank a "#1.234" o "—" cuando no está clasificado. */
	function rankText(value: number | null): string {
		return value != null ? '#' + value.toLocaleString('es-ES') : '—';
	}

	/** Formatea una cantidad DPS/HPS por segundo de forma compacta y legible. */
	function amountText(amount: number | null): string {
		if (amount == null) return '—';
		if (amount >= 1000) return (amount / 1000).toFixed(1).replace('.0', '') + ' k';
		return String(amount);
	}

	/** Fecha ISO yyyy-mm-dd → "dd MMM" en español (corto y limpio). */
	const MESES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
	function dateText(iso: string): string {
		const parts = iso.split('-');
		if (parts.length !== 3) return iso;
		const [y, m, d] = parts;
		const mi = Number(m) - 1;
		const mes = mi >= 0 && mi < 12 ? MESES_ES[mi] : m;
		return `${Number(d)} ${mes} ${y}`;
	}
</script>

<svelte:head>
	<title>{name} · Parses — Jefe de Guerra</title>
	<meta name="robots" content="noindex" />
	<meta
		name="description"
		content={`Parses de ${name} en SSC y Tempest Keep (Dreamscythe, TBC Classic) — vista interna de la hermandad Jefe de Guerra.`}
	/>
</svelte:head>

<main class="player">
	<div class="player__inner">
		<a href="/#salon-fama" class="player__back" use:reveal>
			<span aria-hidden="true">←</span> Volver al Salón de la Fama
		</a>

		{#if hasDetail && detail}
			<!-- ── Resumen (cabecera) ── -->
			<header class="hero" use:reveal={{ delay: 60 }}>
				<div class="hero__glow" aria-hidden="true"></div>
				<div class="hero__top">
					{#if headerIcon}
						<img
							class="hero__icon"
							src={headerIcon}
							alt={detail.mainSpec ?? detail.classLabel ?? 'Clase'}
							width="72"
							height="72"
							decoding="async"
						/>
					{:else}
						<span class="hero__icon hero__icon--letter" aria-hidden="true"
							>{detail.name.charAt(0)}</span
						>
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
					<div
						class="stat stat--hero"
						style="--parse-color: {avgTier?.color}"
					>
						<span class="stat__value">{detail.bestAvg}</span>
						<span class="stat__label">
							Parse medio
							{#if avgTier}<span class="stat__tier">{avgTier.label}</span>{/if}
						</span>
					</div>
					<div class="stat">
						<span class="stat__value stat__value--muted">{detail.median}</span>
						<span class="stat__label">Mediana</span>
					</div>
					{#if metricLabel}
						<div class="stat">
							<span class="stat__value stat__value--metric">{metricLabel}</span>
							<span class="stat__label">Métrica</span>
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

				<a
					class="wcl-btn"
					href={wclCharacterUrl(detail.name)}
					target="_blank"
					rel="noopener noreferrer"
				>
					Ver en WarcraftLogs <span class="wcl-btn__arrow" aria-hidden="true">↗</span>
				</a>
			</header>

			<!-- ── Parses por boss ── -->
			{#if detail.bosses.length > 0}
				<section class="block" aria-labelledby="bosses-title">
					<header class="block__head" use:reveal>
						<h2 id="bosses-title" class="block__title text-engraved">Parses por boss</h2>
						<span class="block__rule" aria-hidden="true"></span>
					</header>

					<div class="bosses" role="table" aria-label="Parses por boss en SSC y Tempest Keep">
						<div class="bosses__header" role="row">
							<span role="columnheader">Boss</span>
							<span role="columnheader" class="col-num">Mejor</span>
							<span role="columnheader" class="col-num col-hide-sm">Kills</span>
							<span role="columnheader" class="col-num">{metricLabel ?? 'Cant.'}</span>
							<span role="columnheader" class="col-num col-hide-sm">iLvl</span>
							<span role="columnheader" class="col-num col-hide-sm">Más rápido</span>
						</div>
						{#each detail.bosses as boss, i (boss.encounterName)}
							{@const tier = boss.best != null ? parseTier(boss.best) : null}
							{@const fastest = formatDuration(boss.fastestKillMs)}
							<div
								class="bosses__row"
								role="row"
								use:reveal={{ delay: Math.min(i * 40, 320) }}
							>
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
										<span
											class="parse-badge"
											style="--parse-color: {tier.color}"
											title={`Parse ${boss.best} · ${tier.label}`}
											aria-label={`Parse ${boss.best}, ${tier.label}`}>{boss.best}</span
										>
									{:else}
										<span class="dash" aria-label="Sin parse">—</span>
									{/if}
								</span>
								<span class="col-num col-hide-sm boss-kills" role="cell">{boss.kills}</span>
								<span class="col-num boss-amount" role="cell">{amountText(boss.amount)}</span>
								<span class="col-num col-hide-sm boss-ilvl" role="cell"
									>{boss.ilvl ?? '—'}</span
								>
								<span class="col-num col-hide-sm boss-fastest" role="cell"
									>{fastest ?? '—'}</span
								>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- ── All-stars por spec ── -->
			{#if detail.allStars.length > 0}
				<section class="block" aria-labelledby="allstars-title">
					<header class="block__head" use:reveal>
						<h2 id="allstars-title" class="block__title text-engraved">All-stars por spec</h2>
						<span class="block__rule" aria-hidden="true"></span>
					</header>

					<div class="allstars">
						{#each detail.allStars as as_, i (as_.spec)}
							{@const tier = as_.rankPercent != null ? parseTier(as_.rankPercent) : null}
							{@const specIcon = specIconUrl(detail.wowClass, as_.spec) ?? classIconUrl(detail.wowClass)}
							<div use:reveal={{ delay: Math.min(i * 80, 320), blur: true }}>
								<Card class="allstar-card">
									<div class="allstar__head">
										{#if specIcon}
											<img
												class="allstar__icon"
												src={specIcon}
												alt=""
												width="32"
												height="32"
												loading="lazy"
												decoding="async"
											/>
										{/if}
										<span class="allstar__spec">{as_.spec}</span>
										{#if as_.rankPercent != null && tier}
											<span
												class="parse-badge allstar__pct"
												style="--parse-color: {tier.color}"
												title={`Percentil ${as_.rankPercent} · ${tier.label}`}
												aria-label={`Percentil ${as_.rankPercent}, ${tier.label}`}
												>{as_.rankPercent}</span
											>
										{/if}
									</div>
									<p class="allstar__points">
										<strong>{as_.points.toLocaleString('es-ES')}</strong>
										<span class="allstar__points-of"
											>/ {as_.possiblePoints.toLocaleString('es-ES')} pts</span
										>
									</p>
									<dl class="allstar__ranks">
										<div>
											<dt>Servidor</dt>
											<dd>{rankText(as_.server)}</dd>
										</div>
										<div>
											<dt>Región</dt>
											<dd>{rankText(as_.region)}</dd>
										</div>
										<div>
											<dt>Mundo</dt>
											<dd>{rankText(as_.world)}</dd>
										</div>
									</dl>
								</Card>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- ── Histórico / kills recientes ── -->
			<section class="block" aria-labelledby="historico-title">
				<header class="block__head" use:reveal>
					<h2 id="historico-title" class="block__title text-engraved">Histórico reciente</h2>
					<span class="block__rule" aria-hidden="true"></span>
				</header>

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
										{dateText(kill.date)}<span class="hero__dot" aria-hidden="true">·</span>{kill.core}
									</span>
								</span>
								{#if kill.parse != null && tier}
									<span
										class="parse-badge"
										style="--parse-color: {tier.color}"
										title={`Parse ${kill.parse} · ${tier.label}`}
										aria-label={`Parse ${kill.parse}, ${tier.label}`}>{kill.parse}</span
									>
								{:else}
									<span class="dash" aria-label="Sin parse">—</span>
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="history__empty">
						Todavía no hay kills recientes registrados para {detail.name} en los logs de SSC y
						Tempest Keep.
					</p>
				{/if}
			</section>
		{:else}
			<!-- ── Estado vacío (sin parses) ── -->
			<div class="empty" use:reveal={{ delay: 60 }}>
				<span class="empty__mark" aria-hidden="true">⚔</span>
				<h1 class="empty__name text-engraved">{name}</h1>
				<p class="empty__title">No encontramos parses de este jugador en SSC/TK todavía.</p>
				<p class="empty__sub">
					Puede que el nombre no esté escrito exactamente igual, que el personaje sea de otro
					reino, o que aún no tenga registros en WarcraftLogs para Caverna del Santuario Serpiente
					ni Tempest Keep.
				</p>
				<a
					class="wcl-btn"
					href={wclCharacterUrl(name)}
					target="_blank"
					rel="noopener noreferrer"
				>
					Buscar en WarcraftLogs <span class="wcl-btn__arrow" aria-hidden="true">↗</span>
				</a>
			</div>
		{/if}
	</div>
</main>

<style>
	.player {
		position: relative;
		padding: clamp(2.5rem, 6vw, 5rem) 1.25rem clamp(4rem, 9vw, 7rem);
	}
	.player__inner {
		max-width: 60rem;
		margin: 0 auto;
	}

	/* Enlace de vuelta — idioma de core-detail. */
	.player__back {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-family: var(--font-display);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-decoration: none;
		color: var(--color-steel);
		transition:
			color 0.2s ease,
			transform 0.2s ease;
	}
	.player__back:hover {
		color: var(--color-ember);
		transform: translateX(-2px);
	}
	.player__back:focus-visible {
		outline: 2px solid var(--color-lava);
		outline-offset: 3px;
		border-radius: 2px;
	}

	/* ── Cabecera / resumen ── */
	.hero {
		position: relative;
		overflow: hidden;
		margin-top: 1.75rem;
		padding: clamp(1.5rem, 4vw, 2.25rem);
		border-radius: 10px;
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
		background: radial-gradient(
			ellipse at center,
			rgba(255, 59, 33, 0.1),
			transparent 65%
		);
	}
	.hero__top {
		position: relative;
		display: flex;
		align-items: center;
		gap: 1.1rem;
		flex-wrap: wrap;
	}
	.hero__icon {
		flex-shrink: 0;
		width: 72px;
		height: 72px;
		border-radius: 12px;
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
		letter-spacing: 0.02em;
		line-height: 1.05;
		margin: 0;
		color: var(--color-silver);
		text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
		word-break: break-word;
	}
	.hero__sub {
		margin: 0.4rem 0 0;
		font-family: var(--font-display);
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-steel-dim);
	}
	.hero__spec {
		color: var(--color-ember);
	}
	.hero__dot {
		margin: 0 0.4rem;
		color: color-mix(in srgb, var(--color-steel) 50%, transparent);
	}

	/* Estadísticas destacadas */
	.stats {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}
	.stat {
		flex: 1 1 6rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.85rem 1rem;
		border-radius: 8px;
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
		letter-spacing: 0.04em;
	}
	.stat__label {
		font-family: var(--font-display);
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-steel-dim);
		display: flex;
		align-items: center;
		gap: 0.4rem;
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
		margin: 0.9rem 0 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}
	.rank {
		text-align: center;
		padding: 0.7rem 0.5rem;
		border-radius: 8px;
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
		letter-spacing: 0.01em;
	}
	.rank--world .rank__value {
		color: var(--color-ember);
	}
	.rank__label {
		display: block;
		margin-top: 0.2rem;
		font-size: 0.64rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-steel-dim);
	}

	/* Botón WarcraftLogs */
	.wcl-btn {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		margin-top: 1.5rem;
		padding: 0.6rem 1.1rem;
		border-radius: 6px;
		font-family: var(--font-display);
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		text-decoration: none;
		color: var(--color-silver);
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--color-blood) 50%, transparent),
			color-mix(in srgb, var(--color-crimson-deep) 60%, transparent)
		);
		border: 1px solid color-mix(in srgb, var(--color-lava) 45%, transparent);
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease,
			border-color 0.2s ease;
	}
	.wcl-btn:hover {
		transform: translateY(-2px);
		border-color: color-mix(in srgb, var(--color-lava) 75%, transparent);
		box-shadow: 0 0 18px rgba(255, 59, 33, 0.4);
	}
	.wcl-btn:focus-visible {
		outline: 2px solid var(--color-lava);
		outline-offset: 3px;
	}
	.wcl-btn__arrow {
		font-size: 0.9em;
		transition: transform 0.2s ease;
	}
	.wcl-btn:hover .wcl-btn__arrow {
		transform: translate(2px, -2px);
	}

	/* ── Bloques (boss / all-stars / histórico) ── */
	.block {
		margin-top: clamp(2.5rem, 5vw, 3.5rem);
	}
	.block__head {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}
	.block__title {
		font-family: var(--font-display);
		font-size: clamp(1.3rem, 4vw, 1.8rem);
		font-weight: 900;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		margin: 0;
		flex-shrink: 0;
	}
	.block__rule {
		flex: 1;
		height: 1px;
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--color-lava) 55%, transparent),
			transparent
		);
	}

	/* Tabla de bosses */
	.bosses {
		border-radius: 8px;
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--color-steel) 14%, transparent);
	}
	.bosses__header,
	.bosses__row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 3.4rem;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.85rem;
	}
	.bosses__header {
		font-family: var(--font-display);
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.08em;
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
		gap: 0.6rem;
		min-width: 0;
	}
	.boss-name__icon {
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		border-radius: 6px;
		object-fit: cover;
		border: 1px solid color-mix(in srgb, var(--color-steel) 28%, transparent);
	}
	.boss-name__text {
		font-weight: 600;
		font-size: 0.86rem;
		color: var(--color-silver);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.boss-kills,
	.boss-ilvl,
	.boss-fastest,
	.boss-amount {
		font-size: 0.84rem;
		color: var(--color-steel);
	}
	.dash {
		color: var(--color-steel-dim);
	}

	/* Insignia de parse (compartida en tablas/cards/histórico). */
	.parse-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.2rem;
		padding: 0.16rem 0.5rem;
		border-radius: 999px;
		font-family: var(--font-display);
		font-size: 0.85rem;
		font-weight: 900;
		line-height: 1;
		color: var(--color-silver);
		background: color-mix(in srgb, var(--parse-color) 18%, transparent);
		border: 1px solid color-mix(in srgb, var(--parse-color) 65%, transparent);
		box-shadow: 0 0 10px color-mix(in srgb, var(--parse-color) 28%, transparent);
	}

	/* All-stars por spec */
	.allstars {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}
	:global(.allstar-card) {
		height: 100%;
		padding: 1.1rem 1.25rem;
	}
	.allstar__head {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 0.75rem;
	}
	.allstar__icon {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		border-radius: 7px;
		object-fit: cover;
		border: 1px solid color-mix(in srgb, var(--color-steel) 30%, transparent);
	}
	.allstar__spec {
		font-family: var(--font-display);
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		color: var(--color-silver);
		flex: 1;
		min-width: 0;
	}
	.allstar__pct {
		flex-shrink: 0;
	}
	.allstar__points {
		margin: 0 0 0.85rem;
		color: var(--color-steel-dim);
		font-size: 0.85rem;
	}
	.allstar__points strong {
		font-family: var(--font-display);
		font-size: 1.4rem;
		font-weight: 900;
		color: var(--color-ember);
	}
	.allstar__points-of {
		margin-left: 0.3rem;
	}
	.allstar__ranks {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		margin: 0;
	}
	.allstar__ranks div {
		text-align: center;
		padding: 0.5rem 0.3rem;
		border-radius: 6px;
		background: color-mix(in srgb, var(--color-ash) 45%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-steel) 12%, transparent);
	}
	.allstar__ranks dt {
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-steel-dim);
	}
	.allstar__ranks dd {
		margin: 0.2rem 0 0;
		font-family: var(--font-display);
		font-size: 0.92rem;
		font-weight: 900;
		color: var(--color-silver);
	}

	/* Histórico */
	.history {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.5rem;
	}
	.history__item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.85rem;
		border-radius: 6px;
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
		border-radius: 6px;
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
		font-size: 0.9rem;
		color: var(--color-silver);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.history__meta {
		font-size: 0.7rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-steel-dim);
	}
	.history__empty {
		padding: clamp(1.5rem, 4vw, 2.25rem);
		text-align: center;
		border-radius: 8px;
		background: color-mix(in srgb, var(--color-stone) 50%, transparent);
		border: 1px dashed color-mix(in srgb, var(--color-steel) 22%, transparent);
		color: var(--color-steel-dim);
		font-size: 0.88rem;
		line-height: 1.6;
		margin: 0;
	}

	/* Estado vacío (sin parses) */
	.empty {
		margin-top: 2.5rem;
		padding: clamp(2.5rem, 6vw, 4rem) clamp(1.5rem, 5vw, 3rem);
		text-align: center;
		border-radius: 10px;
		background: color-mix(in srgb, var(--color-stone) 55%, transparent);
		border: 1px dashed color-mix(in srgb, var(--color-steel) 24%, transparent);
	}
	.empty__mark {
		display: block;
		font-size: 2.5rem;
		color: color-mix(in srgb, var(--color-lava) 70%, transparent);
		margin-bottom: 0.75rem;
		filter: drop-shadow(0 0 12px rgba(255, 59, 33, 0.4));
	}
	.empty__name {
		font-family: var(--font-display);
		font-size: clamp(1.6rem, 6vw, 2.4rem);
		font-weight: 900;
		letter-spacing: 0.02em;
		margin: 0 0 0.85rem;
		word-break: break-word;
	}
	.empty__title {
		font-family: var(--font-display);
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--color-silver);
		margin: 0 0 0.7rem;
	}
	.empty__sub {
		max-width: 38rem;
		margin: 0 auto 1.5rem;
		font-size: 0.88rem;
		line-height: 1.6;
		color: var(--color-steel-dim);
	}
	.empty .wcl-btn {
		margin-top: 0;
	}

	/* ── Responsive ── */
	@media (min-width: 560px) {
		.col-hide-sm {
			display: block;
		}
		.bosses__header,
		.bosses__row {
			grid-template-columns: minmax(0, 1fr) 3.4rem 3rem 4.2rem 3rem 4.6rem;
		}
		.allstars {
			grid-template-columns: 1fr 1fr;
		}
		.history {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (min-width: 880px) {
		.allstars {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.player__back:hover,
		.wcl-btn:hover,
		.wcl-btn:hover .wcl-btn__arrow {
			transform: none;
		}
	}
</style>
