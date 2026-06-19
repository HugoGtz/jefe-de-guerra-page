<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { wclGuildUrl, wclCalendarUrl } from '$lib/data/teams';
	import { classIconUrl, specIconUrl, CLASS_COLORS } from '$lib/wow-icons';
	import { parseColor, roleLabelEs } from '$lib/parse';
	import type { WowClass } from '$lib/data/officers';

	// Datos de SSR (+page.server.ts): el equipo (ya con override WCL de SSC/TK)
	// y su roster derivado de los logs recientes (puede ser null/vacío).
	let { data } = $props();

	const team = $derived(data.team);
	const roster = $derived(data.roster);
	const hasRoster = $derived(!!roster && roster.length > 0);

	function pct(p: { kills: number; total: number }): number {
		return p.total === 0 ? 0 : Math.round((p.kills / p.total) * 100);
	}

	/** Color de clase para teñir el nombre (CLASS_COLORS usa clave en minúsculas). */
	function classColor(wowClass: WowClass | undefined): string | undefined {
		return wowClass ? CLASS_COLORS[wowClass.toLowerCase()] : undefined;
	}

	/** Mejor icono disponible: spec → clase → null (fallback a inicial). */
	function memberIcon(wowClass: WowClass | undefined, spec: string | undefined): string | null {
		return specIconUrl(wowClass, spec?.toLowerCase()) ?? classIconUrl(wowClass);
	}

	/** URL del personaje en WarcraftLogs (ES, Fresh, US/Dreamscythe). */
	function characterUrl(name: string): string {
		return `https://es.fresh.warcraftlogs.com/character/us/dreamscythe/${encodeURIComponent(name)}`;
	}
</script>

<svelte:head>
	<title>{team.name} · Roster — Jefe de Guerra</title>
	<meta
		name="description"
		content={`Roster de ${team.name} de la hermandad Jefe de Guerra (Dreamscythe, TBC Classic), derivado de los logs recientes de SSC y Tempest Keep.`}
	/>
</svelte:head>

<main class="core">
	<div class="core__inner">
		<a href="/#equipos" class="core__back" use:reveal>
			<span aria-hidden="true">←</span> Volver a Equipos
		</a>

		<!-- ── Cabecera del core ── -->
		<header class="core__head" use:reveal={{ delay: 60 }}>
			<div class="core__title-row">
				<h1 class="core__name text-engraved">{team.name}</h1>
				{#if team.recruiting}
					<span class="pill pill--open">Reclutando</span>
				{:else}
					<span class="pill pill--closed">Cerrado</span>
				{/if}
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

			{#if team.wclGuildId}
				<div class="core__links">
					<a
						class="core__logs"
						href={wclGuildUrl(team.wclGuildId)}
						target="_blank"
						rel="noopener noreferrer"
					>
						Logs <span class="core__logs-arrow" aria-hidden="true">↗</span>
					</a>
					<a
						class="core__logs"
						href={wclCalendarUrl(team.wclGuildId)}
						target="_blank"
						rel="noopener noreferrer"
					>
						Calendario <span class="core__logs-arrow" aria-hidden="true">↗</span>
					</a>
				</div>
			{/if}
		</header>

		<!-- ── Roster ── -->
		<section class="roster" aria-labelledby="roster-title">
			<header class="roster__head" use:reveal>
				<h2 id="roster-title" class="roster__title text-engraved">Roster</h2>
				<span class="roster__rule" aria-hidden="true"></span>
			</header>

			{#if hasRoster && roster}
				<p class="roster__hint" use:reveal={{ delay: 40 }}>
					Derivado de los logs recientes de SSC y Tempest Keep (WarcraftLogs).
				</p>
				<ul class="roster__grid">
					{#each roster as member, i (member.name)}
						{@const icon = memberIcon(member.wowClass, member.spec)}
						{@const tint = classColor(member.wowClass)}
						<li use:reveal={{ delay: Math.min(i * 50, 400), blur: true }}>
							<a
								class="member"
								href={characterUrl(member.name)}
								target="_blank"
								rel="noopener noreferrer"
							>
								<Card class="member-card">
									<div class="member__row">
										{#if icon}
											<img
												class="member__icon"
												src={icon}
												alt={member.spec ?? member.classLabel ?? member.wowClass ?? 'Clase'}
												width="44"
												height="44"
												loading="lazy"
												decoding="async"
											/>
										{:else}
											<span class="member__icon member__icon--letter" aria-hidden="true"
												>{member.name.charAt(0)}</span
											>
										{/if}

										<div class="member__body">
											<span class="member__name" style={tint ? `color: ${tint}` : ''}>
												{member.name}
											</span>
											<span class="member__meta">
												{#if member.spec}{member.spec}{/if}
												{#if member.spec && member.specRole}<span class="member__dot">·</span>{/if}
												{#if member.specRole}{roleLabelEs(member.specRole)}{/if}
											</span>
										</div>

										{#if member.score != null}
											<span
												class="member__parse"
												style="--parse-color: {parseColor(member.score)}"
												title="Mejor parse en SSC/TK (WarcraftLogs)"
											>
												{member.score}
											</span>
										{/if}
									</div>
								</Card>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="roster__empty" use:reveal={{ delay: 40 }}>
					<p class="roster__empty-title">Aún no hay logs recientes para este core.</p>
					<p class="roster__empty-sub">
						El roster se construye a partir de los logs de SSC y Tempest Keep en
						WarcraftLogs; cuando este core registre nuevos parses aparecerán aquí.
					</p>
				</div>
			{/if}
		</section>
	</div>
</main>

<style>
	.core {
		position: relative;
		padding: clamp(2.5rem, 6vw, 5rem) 1.25rem clamp(4rem, 9vw, 7rem);
	}
	.core__inner {
		max-width: 64rem;
		margin: 0 auto;
	}

	/* Enlace de vuelta */
	.core__back {
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
	.core__back:hover {
		color: var(--color-ember);
		transform: translateX(-2px);
	}
	.core__back:focus-visible {
		outline: 2px solid var(--color-lava);
		outline-offset: 3px;
		border-radius: 2px;
	}

	/* Cabecera */
	.core__head {
		margin-top: 1.75rem;
		padding: clamp(1.25rem, 3vw, 1.75rem);
		border-radius: 8px;
		background: color-mix(in srgb, var(--color-stone) 70%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-steel) 16%, transparent);
	}
	.core__title-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.85rem;
		margin-bottom: 0.65rem;
	}
	.core__name {
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 6vw, 2.6rem);
		font-weight: 900;
		letter-spacing: 0.03em;
		margin: 0;
	}

	.core__schedule {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0 0 1rem;
		font-size: 0.9rem;
		color: var(--color-steel-dim);
	}
	.core__days {
		font-family: var(--font-display);
		font-weight: 700;
		letter-spacing: 0.04em;
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
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ash);
		background-color: var(--color-steel);
		padding: 0.08rem 0.4rem;
		border-radius: 3px;
		align-self: center;
	}
	.core__note {
		margin: 0 0 1.25rem;
		font-size: 0.88rem;
		line-height: 1.5;
		color: var(--color-steel-dim);
	}
	.core__bars {
		display: grid;
		gap: 0.85rem;
		max-width: 32rem;
	}

	.core__links {
		display: flex;
		flex-wrap: wrap;
		gap: 1.25rem;
		margin-top: 1.4rem;
	}
	.core__logs {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-family: var(--font-display);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
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

	/* Estado (pastilla) — reutiliza el idioma de Teams.svelte. */
	.pill {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.28rem 0.7rem;
		border-radius: 999px;
		font-family: var(--font-display);
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		white-space: nowrap;
		border: 1px solid transparent;
	}
	.pill--open {
		color: var(--color-silver);
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--color-blood) 45%, transparent),
			color-mix(in srgb, var(--color-lava) 30%, transparent)
		);
		border-color: color-mix(in srgb, var(--color-lava) 60%, transparent);
		box-shadow: 0 0 12px rgba(255, 59, 33, 0.35);
	}
	.pill--open::before {
		content: '';
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background-color: var(--color-lava);
		box-shadow: 0 0 8px rgba(255, 59, 33, 0.8);
	}
	.pill--closed {
		color: var(--color-steel-dim);
		background-color: color-mix(in srgb, var(--color-steel) 12%, transparent);
		border-color: color-mix(in srgb, var(--color-steel) 24%, transparent);
	}

	/* Roster */
	.roster {
		margin-top: clamp(2.5rem, 5vw, 3.5rem);
	}
	.roster__head {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.4rem;
	}
	.roster__title {
		font-family: var(--font-display);
		font-size: clamp(1.4rem, 4vw, 1.9rem);
		font-weight: 900;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		margin: 0;
		flex-shrink: 0;
	}
	.roster__rule {
		flex: 1;
		height: 1px;
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--color-lava) 55%, transparent),
			transparent
		);
	}
	.roster__hint {
		margin: 0 0 1.5rem;
		font-size: 0.8rem;
		color: var(--color-steel-dim);
	}

	.roster__grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.85rem;
	}

	/* Tarjeta de miembro: enlace que envuelve el Card (idioma de Officers). */
	.member {
		display: block;
		text-decoration: none;
		border-radius: 8px;
		transition: transform 0.2s ease;
	}
	.member:hover {
		transform: translateY(-2px);
	}
	.member:focus-visible {
		outline: 2px solid var(--color-lava);
		outline-offset: 3px;
		border-radius: 8px;
	}
	:global(.member-card) {
		height: 100%;
		padding: 0.85rem 1rem;
	}
	.member__row {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}
	.member__icon {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		border-radius: 9px;
		object-fit: cover;
		border: 1px solid color-mix(in srgb, var(--color-steel) 34%, transparent);
		box-shadow: inset 0 1px 0 rgba(229, 229, 229, 0.1);
		background: color-mix(in srgb, var(--color-stone) 75%, transparent);
	}
	.member__icon--letter {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-display);
		font-size: 1.3rem;
		font-weight: 900;
		color: var(--color-silver);
		background: linear-gradient(135deg, var(--color-crimson-deep), var(--color-blood));
	}
	.member__body {
		min-width: 0;
		flex: 1;
		display: flex;
		flex-direction: column;
	}
	.member__name {
		font-weight: 700;
		letter-spacing: 0.02em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--color-silver);
	}
	.member__meta {
		font-size: 0.72rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--color-steel-dim);
	}
	.member__dot {
		margin: 0 0.3rem;
	}
	.member__parse {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.2rem;
		padding: 0.18rem 0.5rem;
		border-radius: 999px;
		font-family: var(--font-display);
		font-size: 0.9rem;
		font-weight: 900;
		line-height: 1;
		color: var(--parse-color);
		background: color-mix(in srgb, var(--parse-color) 14%, transparent);
		border: 1px solid color-mix(in srgb, var(--parse-color) 55%, transparent);
		box-shadow: 0 0 10px color-mix(in srgb, var(--parse-color) 28%, transparent);
	}

	/* Estado vacío */
	.roster__empty {
		padding: clamp(2rem, 5vw, 3rem);
		text-align: center;
		border-radius: 8px;
		background: color-mix(in srgb, var(--color-stone) 55%, transparent);
		border: 1px dashed color-mix(in srgb, var(--color-steel) 24%, transparent);
	}
	.roster__empty-title {
		font-family: var(--font-display);
		font-size: 1.05rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		color: var(--color-silver);
		margin: 0 0 0.6rem;
	}
	.roster__empty-sub {
		max-width: 36rem;
		margin: 0 auto;
		font-size: 0.85rem;
		line-height: 1.6;
		color: var(--color-steel-dim);
	}

	@media (min-width: 560px) {
		.roster__grid {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (min-width: 920px) {
		.roster__grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.core__back:hover,
		.core__logs:hover,
		.core__logs:hover .core__logs-arrow,
		.member:hover {
			transform: none;
		}
	}
</style>
