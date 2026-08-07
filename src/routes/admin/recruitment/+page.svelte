<script lang="ts">
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import AdminFormMessage from '$lib/components/admin/AdminFormMessage.svelte';
	import type { PageData, ActionData } from './$types';
	import type { RecruitNeed } from '$lib/data/recruitment';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const r = $derived(data.recruitment);
	const v = $derived(form?.values);

	let submitting = $state(false);

	type NeedRow = RecruitNeed & { key: string };

	// `key` is a client-only synthetic id (not submitted) so the {#each} below
	// can key by identity instead of index — required for out:fade on Quitar
	// to animate the row you actually clicked instead of always the last one.
	// Initialised once from the initial props; further edits are user-driven.
	let needs = $state<NeedRow[]>(
		untrack(() =>
			(form?.values?.needs ?? data.recruitment?.needs ?? []).map((n) => ({
				key: crypto.randomUUID(),
				label: n.label,
				priority: n.priority
			}))
		)
	);

	function addNeed() {
		needs = [...needs, { key: crypto.randomUUID(), label: '', priority: 'media' }];
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
	<p class="lead">
		Texto de bienvenida, enlaces de contacto, clases que buscáis y requisitos para postularse.
	</p>
</div>

<form
	method="POST"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update({ reset: false });
			submitting = false;
		};
	}}
>
	<div class="admin-card">
		<h2>Presentación y contacto</h2>
		<div class="admin-field">
			<label for="intro">Introducción</label>
			<textarea id="intro" name="intro" required>{v?.intro ?? r?.intro ?? ''}</textarea>
		</div>
		<div class="admin-row">
			<div class="admin-field">
				<label for="discordUrl">Enlace de Discord</label>
				<input
					id="discordUrl"
					name="discordUrl"
					type="url"
					value={v?.discordUrl ?? r?.discordUrl ?? ''}
				/>
			</div>
			<div class="admin-field">
				<label for="whatsappUrl">Enlace de WhatsApp</label>
				<input
					id="whatsappUrl"
					name="whatsappUrl"
					type="url"
					value={v?.whatsappUrl ?? r?.whatsappUrl ?? ''}
				/>
			</div>
		</div>
	</div>

	<div class="admin-card">
		<h2>Necesidades <span class="hint">— clases / roles que buscáis</span></h2>
		<div class="admin-list">
			{#each needs as need, i (need.key)}
				<div class="admin-list-row" out:fade={{ duration: 150 }}>
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
						<button
							id="rm-need-{i}"
							type="button"
							class="admin-btn danger"
							onclick={() => removeNeed(i)}>Quitar</button
						>
					</div>
				</div>
			{:else}
				<p class="admin-list-empty">Aún no hay necesidades. Añade la primera abajo.</p>
			{/each}
		</div>
		<div class="admin-actions">
			<button type="button" class="admin-btn secondary" onclick={addNeed}>+ Añadir necesidad</button
			>
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
		<button type="submit" class="admin-btn" disabled={submitting}>
			{#if submitting}
				<span class="admin-spinner" aria-hidden="true"></span>Guardando…
			{:else}
				Guardar cambios
			{/if}
		</button>
		<div style="flex: 1 1 100%; margin-top: var(--spacing-lg);">
			<AdminFormMessage
				success={form?.success ? 'Cambios guardados correctamente.' : undefined}
				error={form?.error}
			/>
		</div>
	</div>
</form>
