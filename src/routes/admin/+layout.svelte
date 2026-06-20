<script lang="ts">
	import './admin.css';
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Show the admin chrome on every authed admin page except the login screen.
	let showChrome = $derived(data.admin && $page.url.pathname !== '/admin/login');

	// Mobile drawer state.
	let navOpen = $state(false);

	// Active-section detection (exact for dashboard, prefix for editors).
	const sections = [
		{ href: '/admin', label: 'Resumen', icon: 'home', exact: true },
		{ href: '/admin/guild', label: 'Identidad y horario', icon: 'shield' },
		{ href: '/admin/teams', label: 'Equipos (Cores)', icon: 'users' },
		{ href: '/admin/officers', label: 'Consejo de Guerra', icon: 'star' },
		{ href: '/admin/recruitment', label: 'Reclutamiento', icon: 'flag' },
		{ href: '/admin/faq', label: 'Preguntas frecuentes', icon: 'question' },
		{ href: '/admin/community', label: 'Comunidad', icon: 'chat' }
	];

	function isActive(href: string, exact = false): boolean {
		const path = $page.url.pathname;
		return exact ? path === href : path === href || path.startsWith(href + '/');
	}

	// Close the drawer after navigating (mobile).
	afterNavigate(() => {
		navOpen = false;
	});
</script>

{#if showChrome}
	<div class="admin-shell" data-nav-open={navOpen}>
		<!-- Mobile top bar -->
		<header class="admin-topbar-mobile">
			<button
				type="button"
				class="admin-menu-btn"
				aria-expanded={navOpen}
				aria-controls="admin-sidebar"
				onclick={() => (navOpen = !navOpen)}
			>
				<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<line x1="3" y1="6" x2="21" y2="6" />
					<line x1="3" y1="12" x2="21" y2="12" />
					<line x1="3" y1="18" x2="21" y2="18" />
				</svg>
				Menú
			</button>
			<a href="/admin" class="admin-brand">
				<span class="mark">JG</span>
				<span class="brand-text">
					<span class="brand-title">Jefe de Guerra</span>
				</span>
			</a>
		</header>

		<!-- Scrim closes the drawer on mobile -->
		<button
			type="button"
			class="admin-scrim"
			aria-label="Cerrar menú"
			tabindex={navOpen ? 0 : -1}
			onclick={() => (navOpen = false)}
		></button>

		<!-- Sidebar -->
		<aside class="admin-sidebar" id="admin-sidebar">
			<a href="/admin" class="admin-brand">
				<span class="mark">JG</span>
				<span class="brand-text">
					<span class="brand-title">Jefe de Guerra</span>
					<span class="brand-sub">Panel de oficiales</span>
				</span>
			</a>

			<nav class="admin-nav" aria-label="Secciones del panel">
				<span class="nav-label">Contenido</span>
				{#each sections as s (s.href)}
					{@const active = isActive(s.href, s.exact)}
					<a href={s.href} aria-current={active ? 'page' : undefined}>
						<svg class="nav-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							{#if s.icon === 'home'}
								<path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
							{:else if s.icon === 'shield'}
								<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />
							{:else if s.icon === 'users'}
								<circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 6a3 3 0 0 1 0 6" /><path d="M21 20a5 5 0 0 0-4-5" />
							{:else if s.icon === 'star'}
								<path d="M12 3l2.6 5.6 6 .8-4.4 4.1 1.1 6L12 16.8 6.7 19.6l1.1-6L3.4 9.4l6-.8z" />
							{:else if s.icon === 'flag'}
								<path d="M5 21V4" /><path d="M5 4h11l-2 3 2 3H5" />
							{:else if s.icon === 'question'}
								<circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3.5" /><line x1="12" y1="17" x2="12" y2="17" />
							{:else if s.icon === 'chat'}
								<path d="M4 5h16v10H8l-4 4z" />
							{/if}
						</svg>
						<span>{s.label}</span>
					</a>
				{/each}
			</nav>

			<div class="admin-sidebar-foot">
				<form method="POST" action="/admin/logout">
					<button type="submit" class="admin-btn secondary admin-logout">
						<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M14 4H6v16h8" /><path d="M10 12h11" /><path d="M18 8l4 4-4 4" />
						</svg>
						Cerrar sesión
					</button>
				</form>
			</div>
		</aside>

		<!-- Content -->
		<main class="admin-main">
			<div class="admin-content">
				{@render children()}
			</div>
		</main>
	</div>
{:else}
	{@render children()}
{/if}
