<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Consejo de Guerra · Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-page-head">
	<h1>Consejo de Guerra</h1>
	<p class="lead">
		La clase y spec mostradas en el sitio se enriquecen automáticamente desde WarcraftLogs.
		Aquí solo defines nombre, rol y, si quieres, una clase y frase manuales.
	</p>
</div>

{#if form?.success}
	<div class="admin-msg ok" role="status">
		<svg class="msg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M20 6 9 17l-5-5" />
		</svg>
		<span>{form.success}</span>
	</div>
{/if}
{#if form?.error}
	<div class="admin-msg err" role="alert">
		<svg class="msg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="13" /><line x1="12" y1="16" x2="12" y2="16" />
		</svg>
		<span>{form.error}</span>
	</div>
{/if}

{#each data.officers as o (o.id)}
	<form method="POST" action="?/update" use:enhance class="admin-card">
		<input type="hidden" name="id" value={o.id} />
		<div class="admin-card-head">
			<h2>{o.name || 'Oficial'}</h2>
			{#if o.role}<span class="badge">{o.role}</span>{/if}
		</div>
		<div class="admin-row">
			<div class="admin-field">
				<label for="name-{o.id}">Nombre</label>
				<input id="name-{o.id}" name="name" type="text" value={o.name} required />
			</div>
			<div class="admin-field">
				<label for="role-{o.id}">Rol</label>
				<input id="role-{o.id}" name="role" type="text" value={o.role} required />
			</div>
			<div class="admin-field">
				<label for="sort-{o.id}">Orden</label>
				<input id="sort-{o.id}" name="sort" type="number" value={o.sort} />
			</div>
		</div>
		<div class="admin-row">
			<div class="admin-field">
				<label for="class-{o.id}">Clase (inglés, opcional)</label>
				<input id="class-{o.id}" name="wowClass" type="text" value={o.wowClass} />
			</div>
			<div class="admin-field">
				<label for="clabel-{o.id}">Clase (español, opcional)</label>
				<input id="clabel-{o.id}" name="classLabel" type="text" value={o.classLabel} />
			</div>
		</div>
		<div class="admin-field">
			<label for="line-{o.id}">Frase / lema (opcional)</label>
			<input id="line-{o.id}" name="line" type="text" value={o.line} />
		</div>
		<div class="admin-actions footer">
			<button type="submit" class="admin-btn">Guardar</button>
			<button type="submit" formaction="?/delete" class="admin-btn danger">Eliminar</button>
		</div>
	</form>
{/each}

<h2>Añadir oficial</h2>
<form method="POST" action="?/create" use:enhance class="admin-card">
	<div class="admin-row">
		<div class="admin-field">
			<label for="new-name">Nombre</label>
			<input id="new-name" name="name" type="text" required />
		</div>
		<div class="admin-field">
			<label for="new-role">Rol</label>
			<input id="new-role" name="role" type="text" required value="Oficial" />
		</div>
		<div class="admin-field">
			<label for="new-sort">Orden</label>
			<input id="new-sort" name="sort" type="number" value={data.officers.length} />
		</div>
	</div>
	<div class="admin-row">
		<div class="admin-field">
			<label for="new-class">Clase (inglés, opcional)</label>
			<input id="new-class" name="wowClass" type="text" />
		</div>
		<div class="admin-field">
			<label for="new-clabel">Clase (español, opcional)</label>
			<input id="new-clabel" name="classLabel" type="text" />
		</div>
	</div>
	<div class="admin-field">
		<label for="new-line">Frase / lema (opcional)</label>
		<input id="new-line" name="line" type="text" />
	</div>
	<div class="admin-actions footer">
		<button type="submit" class="admin-btn">Añadir oficial</button>
	</div>
</form>
