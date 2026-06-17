<script lang="ts">
	import { onMount } from 'svelte';
	import Section from '$lib/components/layout/Section.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { reveal } from '$lib/actions/reveal';
	import type { Guild } from '$lib/data/guild';
	import type { RaidNight } from '$lib/data/community';
	import { getNextRaid, type NextRaid } from '$lib/utils/nextRaid';

	type Community = {
		discordServerId: string;
		discordInvite: string;
		raidTimezone: string;
		raidNights: RaidNight[];
	};

	let {
		community,
		discordUrl
	}: { guild: Guild; community: Community; discordUrl: string } = $props();

	// Derivados del objeto de comunidad para conservar el resto del componente
	// sin cambios. `discordInvite` cae a `discordUrl` si está vacío.
	const discordServerId = $derived(community.discordServerId);
	const raidNights = $derived(community.raidNights);
	const raidTimezone = $derived(community.raidTimezone);
	const discordInvite = $derived(community.discordInvite || discordUrl);

	// El countdown se calcula SOLO en el cliente (depende de la hora actual y
	// de la zona horaria). En SSR / antes de montar mostramos un placeholder
	// estático para evitar saltos de hidratación.
	let mounted = $state(false);
	let next = $state<NextRaid | null>(null);
	let remaining = $state({ days: 0, hours: 0, minutes: 0, seconds: 0 });
	let timer: ReturnType<typeof setInterval> | undefined;

	const discordWidgetUrl = $derived(
		discordServerId
			? `https://discord.com/widget?id=${discordServerId}&theme=dark`
			: ''
	);

	function pad(n: number): string {
		return String(n).padStart(2, '0');
	}

	function tick() {
		const now = new Date();
		// Recalcular el próximo raid si aún no hay uno o si ya pasó.
		if (!next || next.date.getTime() <= now.getTime()) {
			next = getNextRaid(raidNights, raidTimezone, now);
		}
		if (!next) {
			remaining = { days: 0, hours: 0, minutes: 0, seconds: 0 };
			return;
		}
		let diff = Math.max(0, next.date.getTime() - now.getTime());
		const days = Math.floor(diff / 86400000);
		diff -= days * 86400000;
		const hours = Math.floor(diff / 3600000);
		diff -= hours * 3600000;
		const minutes = Math.floor(diff / 60000);
		diff -= minutes * 60000;
		const seconds = Math.floor(diff / 1000);
		remaining = { days, hours, minutes, seconds };
	}

	onMount(() => {
		mounted = true;
		tick();
		// Tic informativo cada segundo — se mantiene aunque haya reduced-motion
		// (no es decorativo). Se limpia al destruir.
		timer = setInterval(tick, 1000);
		return () => {
			if (timer) clearInterval(timer);
		};
	});

	// Unidades del contador para renderizar en bucle.
	const units = $derived([
		{ value: remaining.days, label: 'Días' },
		{ value: remaining.hours, label: 'Horas' },
		{ value: remaining.minutes, label: 'Min' },
		{ value: remaining.seconds, label: 'Seg' }
	]);
</script>

<Section
	id="comunidad"
	eyebrow="Comunidad viva"
	title="Siempre en marcha"
>
	<p class="intro" use:reveal>
		Más allá de las raids, la hermandad late cada día en Discord. Aquí tienes
		la cuenta atrás para el próximo asalto y la puerta de entrada a la
		comunidad.
	</p>

	<div class="layout">
		<!-- ── CUENTA ATRÁS ───────────────────────────────────────── -->
		<div class="countdown-wrap" use:reveal={{ direction: 'left' }}>
			<Card beam class="countdown-card">
				<p class="countdown__eyebrow text-lava-glow">Próximo raid en</p>

				{#if mounted && next}
					<div class="countdown" role="timer" aria-live="off">
						{#each units as unit, i (unit.label)}
							{#if i > 0}
								<span class="countdown__colon" aria-hidden="true">:</span>
							{/if}
							<span class="countdown__unit">
								<span class="countdown__value">{pad(unit.value)}</span>
								<span class="countdown__label">{unit.label}</span>
							</span>
						{/each}
					</div>
					<p class="countdown__meta">{next.label}</p>
				{:else if mounted && !next}
					<p class="countdown__meta countdown__meta--empty">
						Próximamente anunciaremos los horarios.
					</p>
				{:else}
					<!-- Placeholder estático antes de montar (SSR-safe). -->
					<div class="countdown" aria-hidden="true">
						{#each units as unit, i (unit.label)}
							{#if i > 0}
								<span class="countdown__colon">:</span>
							{/if}
							<span class="countdown__unit">
								<span class="countdown__value">--</span>
								<span class="countdown__label">{unit.label}</span>
							</span>
						{/each}
					</div>
					<p class="countdown__meta">Calculando…</p>
				{/if}
			</Card>
		</div>

		<!-- ── DISCORD ────────────────────────────────────────────── -->
		<div class="discord-wrap" use:reveal={{ direction: 'right', delay: 80 }}>
			{#if discordWidgetUrl}
				<div class="discord-frame metal-border">
					<iframe
						src={discordWidgetUrl}
						title="Discord de Jefe de Guerra"
						loading="lazy"
						allowtransparency={true}
						frameborder="0"
						sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
					></iframe>
				</div>
			{:else}
				<Card class="discord-fallback">
					<h3 class="discord-fallback__title text-engraved">
						Únete a nuestro Discord
					</h3>
					<p class="discord-fallback__text">
						Coordinamos raids, hablamos de tácticas y compartimos el día a día
						de la hermandad. La voz de la guerra suena aquí.
					</p>
					<a
						class="discord-fallback__btn glow-red"
						href={discordInvite}
						target="_blank"
						rel="noopener noreferrer"
					>
						Entrar al Discord
					</a>
					<p class="discord-fallback__note">
						El widget en vivo aparecerá aquí cuando se active el servidor.
					</p>
				</Card>
			{/if}
		</div>
	</div>
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

	.layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
		align-items: stretch;
	}

	.countdown-wrap,
	.discord-wrap {
		display: flex;
	}
	:global(.countdown-card) {
		width: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		text-align: center;
	}

	.countdown__eyebrow {
		font-family: var(--font-display);
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		margin: 0 0 1.4rem;
	}

	.countdown {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		gap: 0.35rem;
	}
	.countdown__unit {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		min-width: 3.4rem;
	}
	.countdown__value {
		font-family: var(--font-display);
		font-size: clamp(2.2rem, 8vw, 3.4rem);
		font-weight: 900;
		line-height: 1;
		color: var(--color-lava);
		font-variant-numeric: tabular-nums;
		text-shadow: 0 0 14px rgba(255, 59, 33, 0.45);
	}
	.countdown__label {
		font-family: var(--font-display);
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-steel-dim);
	}
	.countdown__colon {
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 6vw, 2.8rem);
		font-weight: 900;
		line-height: 1;
		color: color-mix(in srgb, var(--color-ember) 70%, transparent);
		padding-top: 0.1rem;
	}

	.countdown__meta {
		margin: 1.5rem 0 0;
		font-family: var(--font-display);
		font-size: 0.9rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--color-ember);
	}
	.countdown__meta--empty {
		color: var(--color-steel-dim);
		font-weight: 400;
	}

	/* ── Discord widget (iframe) ────────────────────────────────── */
	.discord-frame {
		position: relative;
		width: 100%;
		border-radius: 6px;
		overflow: hidden;
		/* Altura del widget oficial de Discord. */
		min-height: 500px;
	}
	.discord-frame iframe {
		display: block;
		width: 100%;
		height: 500px;
		border: 0;
	}

	/* ── Fallback (sin ID de servidor) ──────────────────────────── */
	:global(.discord-fallback) {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		justify-content: center;
		gap: 0.9rem;
	}
	.discord-fallback__title {
		font-size: clamp(1.3rem, 3vw, 1.7rem);
		font-weight: 900;
		letter-spacing: 0.03em;
		margin: 0;
	}
	.discord-fallback__text {
		max-width: 30rem;
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--color-steel);
	}
	.discord-fallback__btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-top: 0.4rem;
		padding: 0.8rem 1.8rem;
		border-radius: 4px;
		font-family: var(--font-display);
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		text-decoration: none;
		color: var(--color-silver);
		background: linear-gradient(135deg, var(--color-blood), var(--color-crimson-deep));
		border: 1px solid color-mix(in srgb, var(--color-lava) 50%, transparent);
		transition:
			transform 0.2s ease,
			box-shadow 0.3s ease;
	}
	.discord-fallback__btn:hover {
		transform: translateY(-2px);
	}
	.discord-fallback__note {
		margin: 0.3rem 0 0;
		font-size: 0.78rem;
		color: var(--color-steel-dim);
	}

	@media (min-width: 820px) {
		.layout {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.discord-fallback__btn:hover {
			transform: none;
		}
	}
</style>
