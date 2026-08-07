<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/** Coarse "hace X" relative label — a static snapshot from load, not a live tick.
	 *  `fetchedAt <= 0` is the single-flight lock's placeholder sentinel (never a
	 *  real fetch timestamp), so it reads as "nunca" too. */
	function relativeLabel(fetchedAt: number | null, now: number): string {
		if (fetchedAt == null || fetchedAt <= 0) return 'nunca';
		const diffMs = now - fetchedAt;
		const minutes = Math.round(diffMs / 60_000);
		if (minutes < 1) return 'hace un momento';
		if (minutes < 60) return `hace ${minutes} min`;
		const hours = Math.round(minutes / 60);
		if (hours < 24) return `hace ${hours} h`;
		const days = Math.round(hours / 24);
		return `hace ${days} d`;
	}

	// Dashboard: links to every editor. The shell/nav/logout live in +layout.svelte.
	const links = [
		{
			href: '/admin/guild',
			title: 'Identidad y horario',
			desc: 'Nombre, lema, facción, horario y textos "quiénes somos".',
			icon: 'shield'
		},
		{
			href: '/admin/teams',
			title: 'Equipos (Cores)',
			desc: 'Crear, editar y eliminar rosters de raid.',
			icon: 'users'
		},
		{
			href: '/admin/raids',
			title: 'Progreso de raid',
			desc: 'Fases, raids y jefes derrotados.',
			icon: 'chart'
		},
		{
			href: '/admin/hazanas',
			title: 'Últimas hazañas',
			desc: 'Kills manuales para el histórico del sitio.',
			icon: 'medal'
		},
		{
			href: '/admin/officers',
			title: 'Consejo de Guerra',
			desc: 'Oficiales y raid líderes.',
			icon: 'star'
		},
		{
			href: '/admin/recruitment',
			title: 'Reclutamiento',
			desc: 'Intro, enlaces, necesidades y requisitos.',
			icon: 'flag'
		},
		{
			href: '/admin/aplicaciones',
			title: 'Aplicaciones',
			desc: 'Solicitudes enviadas por el formulario público.',
			icon: 'inbox'
		},
		{
			href: '/admin/faq',
			title: 'Preguntas frecuentes',
			desc: 'Crear, editar y eliminar preguntas.',
			icon: 'question'
		},
		{
			href: '/admin/community',
			title: 'Comunidad',
			desc: 'Discord, zona horaria y noches de raid.',
			icon: 'chat'
		},
		{
			href: '/admin/wcl',
			title: 'Estado de WarcraftLogs',
			desc: 'Refrescar caché y corregir el histórico de jefes.',
			icon: 'refresh'
		},
		{
			href: '/admin/usuarios',
			title: 'Usuarios',
			desc: 'Crear y eliminar cuentas de oficiales.',
			icon: 'users'
		}
	];
</script>

<svelte:head>
	<title>Panel de administración · Jefe de Guerra</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-page-head">
	<h1>Panel de administración</h1>
	<p class="lead">Edita el contenido editorial del sitio. Los cambios se reflejan al instante.</p>
</div>

<div class="admin-row">
	<a class="admin-card admin-stat" href="/admin/aplicaciones">
		<span class="admin-stat__value">{data.pendingApplications}</span>
		<span class="admin-stat__label">Aplicaciones pendientes</span>
	</a>
	<a class="admin-card admin-stat" href="/admin/raids">
		<span class="admin-stat__value"
			>{data.stats.phase2BossesDown}/{data.stats.phase2BossesTotal}</span
		>
		<span class="admin-stat__label">Jefes de Fase 2 derrotados</span>
	</a>
	<a class="admin-card admin-stat" href="/admin/teams">
		<span class="admin-stat__value">{data.stats.fullClearCores}/{data.stats.activeCores}</span>
		<span class="admin-stat__label">Cores con clear completo</span>
	</a>
</div>

<div class="admin-card">
	<h2>Estado de WarcraftLogs</h2>
	<div class="admin-list">
		{#each data.cacheStatus as ck (ck.key)}
			<div class="admin-list-row">
				<span class="admin-field-action" style="flex:1">{ck.label}</span>
				<span class="hint">{relativeLabel(ck.fetchedAt, data.now)}</span>
			</div>
		{/each}
	</div>
	<div class="admin-actions">
		<a href="/admin/wcl" class="admin-btn secondary">Ver detalle / refrescar</a>
	</div>
</div>

<ul class="admin-dash-links">
	{#each links as l (l.href)}
		<li>
			<a href={l.href}>
				<span class="card-ico">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						{#if l.icon === 'shield'}
							<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />
						{:else if l.icon === 'users'}
							<circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path
								d="M16 6a3 3 0 0 1 0 6"
							/><path d="M21 20a5 5 0 0 0-4-5" />
						{:else if l.icon === 'star'}
							<path d="M12 3l2.6 5.6 6 .8-4.4 4.1 1.1 6L12 16.8 6.7 19.6l1.1-6L3.4 9.4l6-.8z" />
						{:else if l.icon === 'flag'}
							<path d="M5 21V4" /><path d="M5 4h11l-2 3 2 3H5" />
						{:else if l.icon === 'question'}
							<circle cx="12" cy="12" r="9" /><path
								d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3.5"
							/><line x1="12" y1="17" x2="12" y2="17" />
						{:else if l.icon === 'chat'}
							<path d="M4 5h16v10H8l-4 4z" />
						{:else if l.icon === 'chart'}
							<path d="M3 3v18h18" /><path d="M7 16v-4" /><path d="M12 16V8" /><path
								d="M17 16v-7"
							/>
						{:else if l.icon === 'medal'}
							<circle cx="12" cy="8" r="5" /><path d="M8.5 12.5 6 21l6-3 6 3-2.5-8.5" />
						{:else if l.icon === 'inbox'}
							<path d="M4 4h16v16H4z" /><path d="M4 4l8 8 8-8" />
						{:else if l.icon === 'refresh'}
							<path d="M21 2v6h-6" /><path d="M3 22v-6h6" /><path
								d="M21 8A9 9 0 0 0 6 4.6L3 8"
							/><path d="M3 16a9 9 0 0 0 15 4.4l3-3.4" />
						{/if}
					</svg>
				</span>
				<span class="card-body">
					<strong>{l.title}</strong>
					<span>{l.desc}</span>
				</span>
			</a>
		</li>
	{/each}
</ul>
