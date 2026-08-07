<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import { page } from '$app/stores';
	import type { Guild } from '$lib/data/guild';

	// Datos de SSR (+layout.server.ts), expuestos vía $page.data en el layout.
	const guild = $derived($page.data.guild as Guild);

	const year = new Date().getFullYear();
</script>

<footer class="footer">
	<div class="footer__inner">
		<div class="footer__brand">
			<img src="/logo.webp" alt="" width="40" height="35" class="footer__mark" />
			<div>
				<p class="footer__name font-display text-engraved">{guild.name}</p>
				<Badge>{guild.badge}</Badge>
			</div>
		</div>

		<div class="footer__links">
			<a href="/#progreso" class="footer__link">Progreso</a>
			<a href="/#equipos" class="footer__link">Equipos</a>
			<a href="/#reclutamiento" class="footer__link">Reclutamiento</a>
			<a href="/#aplica" class="footer__link">Aplica</a>
		</div>
	</div>

	<p class="footer__credit">
		© {year}
		{guild.name} · Hermandad de {guild.faction} en {guild.server}. Hecho por y para la comunidad. No
		afiliado a Blizzard Entertainment.
	</p>
</footer>

<style>
	.footer {
		position: relative;
		border-top: 1px solid color-mix(in srgb, var(--color-steel) 18%, transparent);
		background-color: color-mix(in srgb, var(--color-ash) 70%, transparent);
		padding: 3rem var(--spacing-2xl) var(--spacing-4xl);
		margin-top: var(--spacing-4xl);
	}
	.footer__inner {
		max-width: 72rem;
		margin: 0 auto;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-3xl);
	}
	.footer__brand {
		display: flex;
		align-items: center;
		gap: var(--spacing-lg);
	}
	.footer__mark {
		filter: drop-shadow(0 0 8px rgba(255, 59, 33, 0.35));
	}
	.footer__name {
		font-size: var(--text-lg);
		font-weight: 700;
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		margin: 0 0 var(--spacing-xs);
	}
	.footer__links {
		display: flex;
		gap: var(--spacing-3xl);
	}
	.footer__link {
		color: var(--color-steel);
		font-family: var(--font-display);
		font-size: var(--text-sm);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		text-decoration: none;
		transition: color 0.2s ease;
	}
	.footer__link:hover {
		color: var(--color-lava);
	}
	.footer__credit {
		max-width: 72rem;
		margin: var(--spacing-4xl) auto 0;
		text-align: center;
		color: var(--color-steel-dim);
		font-size: var(--text-xs);
		line-height: 1.6;
	}
</style>
