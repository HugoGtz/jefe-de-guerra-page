<script lang="ts">
	import { enhance } from '$app/forms';
	import { SvelteSet } from 'svelte/reactivity';
	import { fade } from 'svelte/transition';
	import AdminFormMessage from '$lib/components/admin/AdminFormMessage.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Per-row submitting state so a slow D1 write shows immediate feedback
	// (disabled button + label swap) instead of an inert click followed by a
	// message that seems to appear "out of nowhere".
	let pending = new SvelteSet<string>();
	function trackSubmit(rowId: string) {
		pending.add(rowId);
		return async ({ update }: { update: (opts?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			pending.delete(rowId);
		};
	}
</script>

<svelte:head>
	<title>Consejo de Guerra · Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-page-head">
	<h1>Consejo de Guerra</h1>
	<p class="lead">
		La clase y spec mostradas en el sitio se enriquecen automáticamente desde WarcraftLogs. Aquí
		solo defines nombre, rol y, si quieres, una clase y frase manuales.
	</p>
</div>

{#if form?.id == null}
	<AdminFormMessage success={form?.success} error={form?.error} />
{/if}

{#each data.officers as o (o.id)}
	<form
		method="POST"
		action="?/update"
		use:enhance={() => trackSubmit(String(o.id))}
		class="admin-card"
		out:fade={{ duration: 150 }}
	>
		<input type="hidden" name="id" value={o.id} />
		{#if form?.id === o.id}
			<AdminFormMessage success={form?.success} error={form?.error} />
		{/if}
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
			<button type="submit" class="admin-btn" disabled={pending.has(String(o.id))}>
				{#if pending.has(String(o.id))}
					<span class="admin-spinner" aria-hidden="true"></span>Guardando…
				{:else}
					Guardar
				{/if}
			</button>
			<button
				type="submit"
				formaction="?/delete"
				class="admin-btn danger"
				disabled={pending.has(String(o.id))}
				onclick={(e) => {
					if (!confirm(`¿Eliminar a «${o.name}»?`)) e.preventDefault();
				}}
			>
				{#if pending.has(String(o.id))}
					<span class="admin-spinner" aria-hidden="true"></span>Eliminando…
				{:else}
					Eliminar
				{/if}
			</button>
		</div>
	</form>
{/each}

<h2>Añadir oficial</h2>
<form method="POST" action="?/create" use:enhance={() => trackSubmit('create')} class="admin-card">
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
		<button type="submit" class="admin-btn" disabled={pending.has('create')}>
			{#if pending.has('create')}
				<span class="admin-spinner" aria-hidden="true"></span>Añadiendo…
			{:else}
				Añadir oficial
			{/if}
		</button>
	</div>
</form>
