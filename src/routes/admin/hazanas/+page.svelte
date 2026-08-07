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
	<title>Últimas hazañas · Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-page-head">
	<h1>Últimas hazañas</h1>
	<p class="lead">
		Kills manuales para la sección "Últimas hazañas" del sitio. Los de Fase 2 (SSC/TK) se reemplazan
		automáticamente en cuanto WarcraftLogs tenga datos — esto es sobre todo para
		Karazhan/Gruul/Magtheridon y para el histórico.
	</p>
</div>

{#if form?.id == null}
	<AdminFormMessage success={form?.success} error={form?.error} />
{/if}

{#each data.feats as item (item.id)}
	{@const rowId = String(item.id)}
	<form
		method="POST"
		action="?/update"
		use:enhance={() => trackSubmit(rowId)}
		class="admin-card"
		out:fade={{ duration: 150 }}
	>
		<input type="hidden" name="id" value={item.id} />
		{#if form?.id === item.id}
			<AdminFormMessage success={form?.success} error={form?.error} />
		{/if}
		<div class="admin-card-head">
			<h2>{item.boss}</h2>
			<span class="badge">{item.raid}</span>
		</div>
		<div class="admin-row">
			<div class="admin-field">
				<label for="boss-{item.id}">Jefe</label>
				<input id="boss-{item.id}" name="boss" type="text" value={item.boss} required />
			</div>
			<div class="admin-field">
				<label for="raid-{item.id}">Raid</label>
				<select id="raid-{item.id}" name="raid" value={item.raid}>
					{#each data.raids as r (r)}
						<option value={r}>{r}</option>
					{/each}
				</select>
			</div>
			<div class="admin-field">
				<label for="date-{item.id}">Fecha</label>
				<input id="date-{item.id}" name="date" type="date" value={item.date} required />
			</div>
		</div>
		<div class="admin-row">
			<div class="admin-field">
				<label for="team-{item.id}">Equipo (opcional)</label>
				<input id="team-{item.id}" name="team" type="text" value={item.team ?? ''} />
			</div>
			<div class="admin-field">
				<label for="sort-{item.id}">Orden</label>
				<input id="sort-{item.id}" name="sort" type="number" value={item.sort} />
			</div>
		</div>
		<div class="admin-check">
			<input id="fk-{item.id}" name="firstKill" type="checkbox" checked={item.firstKill} />
			<label for="fk-{item.id}">Primer kill de la hermandad</label>
		</div>
		<div class="admin-actions footer">
			<button type="submit" class="admin-btn" disabled={pending.has(rowId)}>
				{#if pending.has(rowId)}
					<span class="admin-spinner" aria-hidden="true"></span>Guardando…
				{:else}
					Guardar
				{/if}
			</button>
			<button
				type="submit"
				formaction="?/delete"
				class="admin-btn danger"
				disabled={pending.has(rowId)}
				onclick={(e) => {
					if (!confirm(`¿Eliminar la hazaña «${item.boss}»?`)) e.preventDefault();
				}}
			>
				{#if pending.has(rowId)}
					<span class="admin-spinner" aria-hidden="true"></span>Eliminando…
				{:else}
					Eliminar
				{/if}
			</button>
		</div>
	</form>
{/each}

<h2>Añadir hazaña</h2>
<form method="POST" action="?/create" use:enhance={() => trackSubmit('create')} class="admin-card">
	<div class="admin-row">
		<div class="admin-field">
			<label for="new-boss">Jefe</label>
			<input id="new-boss" name="boss" type="text" required />
		</div>
		<div class="admin-field">
			<label for="new-raid">Raid</label>
			<select id="new-raid" name="raid">
				{#each data.raids as r (r)}
					<option value={r}>{r}</option>
				{/each}
			</select>
		</div>
		<div class="admin-field">
			<label for="new-date">Fecha</label>
			<input id="new-date" name="date" type="date" required />
		</div>
	</div>
	<div class="admin-row">
		<div class="admin-field">
			<label for="new-team">Equipo (opcional)</label>
			<input id="new-team" name="team" type="text" />
		</div>
		<div class="admin-field">
			<label for="new-sort">Orden</label>
			<input id="new-sort" name="sort" type="number" value={data.feats.length} />
		</div>
	</div>
	<div class="admin-check">
		<input id="new-fk" name="firstKill" type="checkbox" />
		<label for="new-fk">Primer kill de la hermandad</label>
	</div>
	<div class="admin-actions footer">
		<button type="submit" class="admin-btn" disabled={pending.has('create')}>
			{#if pending.has('create')}
				<span class="admin-spinner" aria-hidden="true"></span>Añadiendo…
			{:else}
				Añadir hazaña
			{/if}
		</button>
	</div>
</form>
