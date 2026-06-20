<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Preguntas frecuentes · Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-page-head">
	<h1>Preguntas frecuentes</h1>
	<p class="lead">Crea, edita y ordena las preguntas que aparecen en la sección de FAQ del sitio.</p>
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

{#each data.faq as item (item.id)}
	<form method="POST" action="?/update" use:enhance class="admin-card">
		<input type="hidden" name="id" value={item.id} />
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
			<button type="submit" class="admin-btn">Guardar</button>
			<button type="submit" formaction="?/delete" class="admin-btn danger">Eliminar</button>
		</div>
	</form>
{/each}

<h2>Añadir pregunta</h2>
<form method="POST" action="?/create" use:enhance class="admin-card">
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
		<button type="submit" class="admin-btn">Añadir pregunta</button>
	</div>
</form>
