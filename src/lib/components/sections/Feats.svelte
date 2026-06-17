<script lang="ts">
	import Section from '$lib/components/layout/Section.svelte';
	import { reveal } from '$lib/actions/reveal';
	import type { Feat } from '$lib/data/kills';

	let { feats }: { feats: Feat[] } = $props();

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

	/** Formatea 'yyyy-mm-dd' como "12 jun 2026" (sin libs, sin TZ). */
	function formatDate(iso: string): string {
		const [y, m, d] = iso.split('-').map(Number);
		if (!y || !m || !d) return iso;
		return `${d} ${MONTHS_ES[m - 1] ?? ''} ${y}`;
	}

	/** Nombre completo de la raid para accesibilidad / título de la insignia. */
	function raidName(raid: Feat['raid']): string {
		switch (raid) {
			case 'SSC':
				return 'Caverna del Santuario Serpiente';
			case 'TK':
				return 'Fortaleza de la Tempestad';
			case 'Karazhan':
				return 'Karazhan';
			case 'Gruul':
				return 'Guarida de Gruul';
			case 'Magtheridon':
				return 'Cámara de Magtheridon';
		}
	}
</script>

<Section id="hazanas" eyebrow="Salón de la gloria" title="Últimas hazañas">
	<p class="intro" use:reveal>
		Las kills más recientes de la hueste, las más frescas arriba. Cada marca
		es un boss que ya no se levanta.
	</p>

	<ol class="timeline">
		{#each feats as feat, i (feat.boss + feat.date)}
			<li
				class="feat"
				class:is-first={feat.firstKill}
				use:reveal={{ delay: 80 + i * 90, direction: 'left' }}
			>
				<span class="feat__node" aria-hidden="true"></span>

				<div class="feat__body">
					<div class="feat__head">
						<h3 class="feat__boss text-engraved">{feat.boss}</h3>
						{#if feat.firstKill}
							<span class="feat__first">First Kill</span>
						{/if}
					</div>

					<div class="feat__meta">
						<span
							class="feat__raid"
							title={raidName(feat.raid)}>{feat.raid}</span
						>
						<time class="feat__date" datetime={feat.date}>
							{formatDate(feat.date)}
						</time>
						{#if feat.team}
							<span class="feat__sep" aria-hidden="true">·</span>
							<span class="feat__team">{feat.team}</span>
						{/if}
					</div>
				</div>
			</li>
		{/each}
	</ol>
</Section>

<style>
	.intro {
		max-width: 42rem;
		margin: 0 auto clamp(2.5rem, 5vw, 3.5rem);
		text-align: center;
		font-size: 1.05rem;
		line-height: 1.7;
		color: var(--color-steel);
	}

	.timeline {
		list-style: none;
		margin: 0 auto;
		padding: 0;
		max-width: 46rem;
		position: relative;
	}
	/* Línea vertical luminosa que recorre la columna de nodos. */
	.timeline::before {
		content: '';
		position: absolute;
		top: 0.4rem;
		bottom: 0.4rem;
		left: 7px;
		width: 2px;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--color-lava) 80%, transparent),
			color-mix(in srgb, var(--color-blood) 60%, transparent),
			color-mix(in srgb, var(--color-steel) 22%, transparent)
		);
		box-shadow: 0 0 10px rgba(255, 59, 33, 0.4);
	}

	.feat {
		position: relative;
		padding: 0 0 1.6rem 2.4rem;
	}
	.feat:last-child {
		padding-bottom: 0;
	}

	.feat__node {
		position: absolute;
		left: 0;
		top: 0.3rem;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: radial-gradient(
			circle at 35% 30%,
			var(--color-ember),
			var(--color-blood)
		);
		border: 2px solid var(--color-ash);
		box-shadow: 0 0 8px rgba(255, 59, 33, 0.55);
	}
	.feat.is-first .feat__node {
		background: radial-gradient(
			circle at 35% 30%,
			#fff,
			var(--color-lava)
		);
		box-shadow: 0 0 14px rgba(255, 107, 44, 0.85);
	}

	.feat__head {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-bottom: 0.4rem;
	}
	.feat__boss {
		font-family: var(--font-display);
		font-size: clamp(1.05rem, 2.5vw, 1.3rem);
		font-weight: 900;
		letter-spacing: 0.02em;
		margin: 0;
		color: var(--color-silver);
	}
	.feat__first {
		display: inline-flex;
		align-items: center;
		padding: 0.18rem 0.55rem;
		border-radius: 999px;
		font-family: var(--font-display);
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-ash);
		background: linear-gradient(135deg, var(--color-ember), var(--color-lava));
		box-shadow: 0 0 10px rgba(255, 107, 44, 0.55);
	}

	.feat__meta {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--color-steel-dim);
	}
	.feat__raid {
		font-family: var(--font-display);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: var(--color-ash);
		background-color: var(--color-steel);
		padding: 0.12rem 0.5rem;
		border-radius: 3px;
	}
	.feat__date {
		font-variant-numeric: tabular-nums;
		color: var(--color-steel);
	}
	.feat__sep {
		color: var(--color-ember);
	}
	.feat__team {
		font-family: var(--font-display);
		font-weight: 700;
		color: var(--color-ember);
	}
</style>
