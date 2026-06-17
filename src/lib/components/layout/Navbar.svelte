<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/Button.svelte';
	import { scrollSpy } from '$lib/actions/scrollSpy';
	import type { Guild } from '$lib/data/guild';
	import type { Recruitment } from '$lib/data/recruitment';

	// Datos de SSR (+layout.server.ts), expuestos vía $page.data en el layout.
	const guild = $derived($page.data.guild as Guild);
	const recruitment = $derived($page.data.recruitment as Recruitment);

	const links = [
		{ href: '#inicio', label: 'Inicio' },
		{ href: '#la-guild', label: 'La Guild' },
		{ href: '#progreso', label: 'Progreso' },
		{ href: '#equipos', label: 'Equipos' },
		{ href: '#comunidad', label: 'Comunidad' },
		{ href: '#reclutamiento', label: 'Reclutamiento' },
		{ href: '#oficiales', label: 'Oficiales' }
	];

	// IDs de sección observados por el scroll-spy (sin el '#').
	const sectionIds = links.map((l) => l.href.slice(1));

	let scrolled = $state(false);
	let open = $state(false);
	let activeId = $state<string | null>(null);

	// En la portada (hero) el logo grande ya está presente, así que el del
	// navbar se oculta; aparece al hacer scroll a otras secciones.
	const onHero = $derived(activeId === null || activeId === 'inicio');

	onMount(() => {
		const onScroll = () => {
			scrolled = window.scrollY > 24;
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	function close() {
		open = false;
	}
</script>

<header
	class="nav"
	class:is-scrolled={scrolled}
	use:scrollSpy={{ ids: sectionIds, onactive: (id) => (activeId = id) }}
>
	<nav class="nav__inner" aria-label="Navegación principal">
		<a
			href="#inicio"
			class="nav__brand"
			class:is-hidden={onHero}
			aria-hidden={onHero}
			tabindex={onHero ? -1 : 0}
			onclick={close}
		>
			<img src="/logo.webp" alt="" width="32" height="28" class="nav__brand-mark" />
			<span class="nav__brand-name font-display">{guild.name}</span>
		</a>

		<ul class="nav__links">
			{#each links as link (link.href)}
				<li>
					<a
						href={link.href}
						class="nav__link"
						class:is-active={activeId === link.href.slice(1)}
						aria-current={activeId === link.href.slice(1) ? 'true' : undefined}
						onclick={close}>{link.label}</a
					>
				</li>
			{/each}
		</ul>

		<div class="nav__cta">
			<Button
				variant="primary"
				href={recruitment.discordUrl}
				target="_blank"
				rel="noopener noreferrer">Únete</Button
			>
		</div>

		<button
			class="nav__toggle metal-border"
			aria-label="Abrir menú"
			aria-expanded={open}
			onclick={() => (open = !open)}
		>
			<span class="nav__toggle-bar" class:is-open={open}></span>
			<span class="nav__toggle-bar" class:is-open={open}></span>
			<span class="nav__toggle-bar" class:is-open={open}></span>
		</button>
	</nav>

	{#if open}
		<div class="nav__mobile surface">
			<ul class="nav__mobile-links">
				{#each links as link (link.href)}
					<li>
						<a href={link.href} class="nav__link" onclick={close}>{link.label}</a>
					</li>
				{/each}
			</ul>
			<Button
				variant="primary"
				href={recruitment.discordUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="nav__mobile-cta">Únete al Discord</Button
			>
		</div>
	{/if}
</header>

<style>
	.nav {
		position: sticky;
		top: 0;
		z-index: 50;
		width: 100%;
		transition:
			background-color 0.3s ease,
			backdrop-filter 0.3s ease,
			box-shadow 0.3s ease,
			border-color 0.3s ease;
		border-bottom: 1px solid transparent;
		/* Entrada de carga: baja deslizándose, primer paso de la cascada. */
		animation: nav-drop 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes nav-drop {
		from {
			opacity: 0;
			transform: translateY(-100%);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.nav.is-scrolled {
		background-color: color-mix(in srgb, var(--color-ash) 82%, transparent);
		backdrop-filter: blur(12px) saturate(1.1);
		border-bottom-color: color-mix(in srgb, var(--color-steel) 22%, transparent);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
	}

	.nav__inner {
		max-width: 80rem;
		margin: 0 auto;
		padding: 0.75rem 1.25rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.nav__brand {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		text-decoration: none;
		margin-right: auto;
		transition:
			opacity 0.35s ease,
			transform 0.35s ease;
	}
	/* Oculto en la portada (mantiene su espacio para no descuadrar el navbar);
	   reaparece con un leve descenso al hacer scroll a otras secciones. */
	.nav__brand.is-hidden {
		opacity: 0;
		transform: translateY(-8px);
		pointer-events: none;
	}
	.nav__brand-mark {
		filter: drop-shadow(0 0 6px rgba(255, 59, 33, 0.4));
	}
	.nav__brand-name {
		color: var(--color-silver);
		font-weight: 700;
		font-size: 1.05rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.nav__links {
		display: none;
		align-items: center;
		gap: 1.5rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.nav__link {
		color: var(--color-steel);
		font-family: var(--font-display);
		font-size: 0.85rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		text-decoration: none;
		transition: color 0.2s ease;
		position: relative;
	}
	.nav__link::after {
		content: '';
		position: absolute;
		left: 0;
		bottom: -4px;
		width: 0;
		height: 1px;
		background-color: var(--color-lava);
		box-shadow: 0 0 8px rgba(255, 59, 33, 0.6);
		transition: width 0.25s ease;
	}
	.nav__link:hover {
		color: var(--color-silver);
	}
	.nav__link:hover::after {
		width: 100%;
	}
	/* Sección activa (scroll-spy): resaltado persistente. */
	.nav__link.is-active {
		color: var(--color-silver);
	}
	.nav__link.is-active::after {
		width: 100%;
	}

	.nav__cta {
		display: none;
	}

	.nav__toggle {
		display: inline-flex;
		flex-direction: column;
		justify-content: center;
		gap: 4px;
		width: 42px;
		height: 42px;
		padding: 0 9px;
		border-radius: 3px;
		background-color: var(--color-stone);
		cursor: pointer;
	}
	.nav__toggle-bar {
		display: block;
		height: 2px;
		width: 100%;
		background-color: var(--color-silver);
		transition:
			transform 0.25s ease,
			opacity 0.25s ease;
	}
	.nav__toggle-bar.is-open:nth-child(1) {
		transform: translateY(6px) rotate(45deg);
	}
	.nav__toggle-bar.is-open:nth-child(2) {
		opacity: 0;
	}
	.nav__toggle-bar.is-open:nth-child(3) {
		transform: translateY(-6px) rotate(-45deg);
	}

	.nav__mobile {
		padding: 1rem 1.25rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		border-radius: 0;
	}
	.nav__mobile-links {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	:global(.nav__mobile-cta) {
		width: 100%;
	}

	@media (min-width: 860px) {
		.nav__links {
			display: flex;
		}
		.nav__cta {
			display: block;
		}
		.nav__toggle {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.nav {
			animation: none;
		}
		.nav__toggle-bar {
			transition: none;
		}
	}
</style>
