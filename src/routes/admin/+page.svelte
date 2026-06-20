<script lang="ts">
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
	<p class="lead">
		Edita el contenido editorial del sitio. Los cambios se reflejan al instante.
	</p>
</div>

<ul class="admin-dash-links">
	{#each links as l (l.href)}
		<li>
			<a href={l.href}>
				<span class="card-ico">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						{#if l.icon === 'shield'}
							<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />
						{:else if l.icon === 'users'}
							<circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 6a3 3 0 0 1 0 6" /><path d="M21 20a5 5 0 0 0-4-5" />
						{:else if l.icon === 'star'}
							<path d="M12 3l2.6 5.6 6 .8-4.4 4.1 1.1 6L12 16.8 6.7 19.6l1.1-6L3.4 9.4l6-.8z" />
						{:else if l.icon === 'flag'}
							<path d="M5 21V4" /><path d="M5 4h11l-2 3 2 3H5" />
						{:else if l.icon === 'question'}
							<circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3.5" /><line x1="12" y1="17" x2="12" y2="17" />
						{:else if l.icon === 'chat'}
							<path d="M4 5h16v10H8l-4 4z" />
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
