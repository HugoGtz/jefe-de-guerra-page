<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import type { RecruitNeed } from '$lib/data/recruitment';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const r = $derived(data.recruitment);
	const v = $derived(form?.values);

	// Editable list of needs (label + priority), seeded from form echo or DB.
	// Initialised once from the initial props; further edits are user-driven.
	let needs = $state<RecruitNeed[]>(
		untrack(() =>
			(form?.values?.needs ?? data.recruitment?.needs ?? []).map((n) => ({
				label: n.label,
				priority: n.priority
			}))
		)
	);

	function addNeed() {
		needs = [...needs, { label: '', priority: 'media' }];
	}
	function removeNeed(i: number) {
		needs = needs.filter((_, idx) => idx !== i);
	}

	const requirementsText = $derived(v?.requirements ?? r?.requirements ?? []);
</script>

<svelte:head>
	<title>Reclutamiento · Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-page-head">
	<h1>Reclutamiento</h1>
	<p class="lead">Texto de bienvenida, enlaces de contacto, clases que buscáis y requisitos para postularse.</p>
</div>

{#if form?.success}
	<div class="admin-msg ok" role="status">
		<svg class="msg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M20 6 9 17l-5-5" />
		</svg>
		<span>Cambios guardados correctamente.</span>
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

<form method="POST" use:enhance>
	<div class="admin-card">
		<h2>Presentación y contacto</h2>
		<div class="admin-field">
			<label for="intro">Introducción</label>
			<textarea id="intro" name="intro" required>{v?.intro ?? r?.intro ?? ''}</textarea>
		</div>
		<div class="admin-row">
			<div class="admin-field">
				<label for="discordUrl">Enlace de Discord</label>
				<input id="discordUrl" name="discordUrl" type="url" value={v?.discordUrl ?? r?.discordUrl ?? ''} />
			</div>
			<div class="admin-field">
				<label for="whatsappUrl">Enlace de WhatsApp</label>
				<input id="whatsappUrl" name="whatsappUrl" type="url" value={v?.whatsappUrl ?? r?.whatsappUrl ?? ''} />
			</div>
		</div>
	</div>

	<div class="admin-card">
		<h2>Necesidades <span class="hint">— clases / roles que buscáis</span></h2>
		<div class="admin-list">
			{#each needs as need, i (i)}
				<div class="admin-list-row">
					<div class="admin-field">
						<label for="need-{i}">Clase / rol</label>
						<input id="need-{i}" name="needLabel" type="text" bind:value={need.label} />
					</div>
					<div class="admin-field">
						<label for="prio-{i}">Prioridad</label>
						<select id="prio-{i}" name="needPriority" bind:value={need.priority}>
							<option value="alta">Alta</option>
							<option value="media">Media</option>
							<option value="baja">Baja</option>
						</select>
					</div>
					<div class="admin-field admin-field-action">
						<label for="rm-need-{i}" aria-hidden="true">Quitar</label>
						<button id="rm-need-{i}" type="button" class="admin-btn danger" onclick={() => removeNeed(i)}>Quitar</button>
					</div>
				</div>
			{:else}
				<p class="admin-list-empty">Aún no hay necesidades. Añade la primera abajo.</p>
			{/each}
		</div>
		<div class="admin-actions">
			<button type="button" class="admin-btn secondary" onclick={addNeed}>+ Añadir necesidad</button>
		</div>
	</div>

	<div class="admin-card">
		<h2>Requisitos</h2>
		<div class="admin-field">
			<label for="requirements">Requisitos (uno por línea)</label>
			<textarea id="requirements" name="requirements">{requirementsText.join('\n')}</textarea>
		</div>
	</div>

	<div class="admin-actions footer">
		<button type="submit" class="admin-btn">Guardar cambios</button>
	</div>
</form>
