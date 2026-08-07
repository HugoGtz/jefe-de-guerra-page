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
	<title>Preguntas frecuentes · Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-page-head">
	<h1>Preguntas frecuentes</h1>
	<p class="lead">
		Crea, edita y ordena las preguntas que aparecen en la sección de FAQ del sitio.
	</p>
</div>

{#if form?.id == null}
	<AdminFormMessage success={form?.success} error={form?.error} />
{/if}

{#each data.faq as item (item.id)}
	<form
		method="POST"
		action="?/update"
		use:enhance={() => trackSubmit(String(item.id))}
		class="admin-card"
		out:fade={{ duration: 150 }}
	>
		<input type="hidden" name="id" value={item.id} />
		{#if form?.id === item.id}
			<AdminFormMessage success={form?.success} error={form?.error} />
		{/if}
		<div class="admin-card-head">
			<h2>Pregunta #{item.sort}</h2>
		</div>
		<div class="admin-field">
			<label for="q-{item.id}">Pregunta</label>
			<input id="q-{item.id}" name="q" type="text" value={item.q} required />
		</div>
		<div class="admin-field">
			<label for="a-{item.id}">Respuesta</label>
			<textarea id="a-{item.id}" name="a" required>{item.a}</textarea>
		</div>
		<div class="admin-field">
			<label for="sort-{item.id}">Orden</label>
			<input id="sort-{item.id}" name="sort" type="number" value={item.sort} />
		</div>
		<div class="admin-actions footer">
			<button type="submit" class="admin-btn" disabled={pending.has(String(item.id))}>
				{#if pending.has(String(item.id))}
					<span class="admin-spinner" aria-hidden="true"></span>Guardando…
				{:else}
					Guardar
				{/if}
			</button>
			<button
				type="submit"
				formaction="?/delete"
				class="admin-btn danger"
				disabled={pending.has(String(item.id))}
				onclick={(e) => {
					if (!confirm(`¿Eliminar la pregunta «${item.q}»?`)) e.preventDefault();
				}}
			>
				{#if pending.has(String(item.id))}
					<span class="admin-spinner" aria-hidden="true"></span>Eliminando…
				{:else}
					Eliminar
				{/if}
			</button>
		</div>
	</form>
{/each}

<h2>Añadir pregunta</h2>
<form method="POST" action="?/create" use:enhance={() => trackSubmit('create')} class="admin-card">
	<div class="admin-field">
		<label for="new-q">Pregunta</label>
		<input id="new-q" name="q" type="text" required />
	</div>
	<div class="admin-field">
		<label for="new-a">Respuesta</label>
		<textarea id="new-a" name="a" required></textarea>
	</div>
	<div class="admin-field">
		<label for="new-sort">Orden</label>
		<input id="new-sort" name="sort" type="number" value={data.faq.length} />
	</div>
	<div class="admin-actions footer">
		<button type="submit" class="admin-btn" disabled={pending.has('create')}>
			{#if pending.has('create')}
				<span class="admin-spinner" aria-hidden="true"></span>Añadiendo…
			{:else}
				Añadir pregunta
			{/if}
		</button>
	</div>
</form>
