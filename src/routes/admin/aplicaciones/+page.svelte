<script lang="ts">
	import { enhance } from '$app/forms';
	import { SvelteSet } from 'svelte/reactivity';
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

	function formatDate(epochMs: number): string {
		return new Date(epochMs).toLocaleString('es-MX', {
			dateStyle: 'medium',
			timeStyle: 'short'
		});
	}
</script>

{#snippet activityResults(reports: { code: string; startTime: number; zoneName: string | null }[])}
	{#if reports.length === 0}
		<p class="hint">Sin reports recientes de WarcraftLogs para este nombre.</p>
	{:else}
		<ul class="admin-list" style="margin-bottom: 0;">
			{#each reports as r (r.code)}
				<li class="admin-list-row" style="align-items: center;">
					<span class="admin-field-action" style="flex:1">
						{formatDate(r.startTime)}
						{#if r.zoneName}· {r.zoneName}{/if}
					</span>
					<a
						class="admin-btn secondary"
						href={`https://fresh.warcraftlogs.com/reports/${r.code}`}
						target="_blank"
						rel="noreferrer"
					>
						Ver log ↗
					</a>
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

<svelte:head>
	<title>Aplicaciones · Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-page-head">
	<h1>Aplicaciones</h1>
	<p class="lead">
		Registro de las solicitudes enviadas por el formulario público. Siguen llegando a Discord en
		tiempo real — esto es solo para consultarlas después.
	</p>
</div>

{#each data.applications as app (app.id)}
	{@const rowId = String(app.id)}
	{@const activityRowId = 'activity:' + app.id}
	<div class="admin-card">
		{#if form?.scope === 'toggle' && form.id === app.id}
			<AdminFormMessage success={form?.success} error={form?.error} />
		{/if}
		<div class="admin-card-head">
			<h2>{app.character}</h2>
			<span class="badge">{app.wowClass}</span>
			{#if app.reviewed}
				<span class="badge">Revisada</span>
			{:else}
				<span class="badge">Pendiente</span>
			{/if}
		</div>
		<p class="hint">{formatDate(app.createdAt)}</p>
		<div class="admin-row">
			{#if app.spec}<p><strong>Spec / rol:</strong> {app.spec}</p>{/if}
			{#if app.ilvl}<p><strong>iLvl:</strong> {app.ilvl}</p>{/if}
		</div>
		{#if app.logs}
			<p>
				<strong>Logs:</strong> <a href={app.logs} target="_blank" rel="noreferrer">{app.logs}</a>
			</p>
		{/if}
		{#if app.availability}<p><strong>Disponibilidad:</strong> {app.availability}</p>{/if}
		{#if app.experience}<p><strong>Experiencia:</strong> {app.experience}</p>{/if}
		{#if app.message}<p><strong>Mensaje:</strong> {app.message}</p>{/if}

		<div class="admin-actions footer">
			<form method="POST" action="?/toggleReviewed" use:enhance={() => trackSubmit(rowId)}>
				<input type="hidden" name="id" value={app.id} />
				<input type="hidden" name="reviewed" value={!app.reviewed} />
				<button type="submit" class="admin-btn secondary" disabled={pending.has(rowId)}>
					{#if pending.has(rowId)}
						<span class="admin-spinner" aria-hidden="true"></span>Marcando…
					{:else}
						{app.reviewed ? 'Marcar como pendiente' : 'Marcar como revisada'}
					{/if}
				</button>
			</form>
			<form method="POST" action="?/checkActivity" use:enhance={() => trackSubmit(activityRowId)}>
				<input type="hidden" name="id" value={app.id} />
				<input type="hidden" name="character" value={app.character} />
				<button type="submit" class="admin-btn secondary" disabled={pending.has(activityRowId)}>
					{#if pending.has(activityRowId)}
						<span class="admin-spinner" aria-hidden="true"></span>Consultando…
					{:else}
						Ver actividad reciente en WCL
					{/if}
				</button>
			</form>
		</div>

		{#if form?.scope === 'activity' && form.id === app.id}
			<div style="margin-top: var(--spacing-lg);">
				{#if form.error}
					<AdminFormMessage error={form.error} />
				{:else if form.reports}
					{@render activityResults(form.reports)}
				{/if}
			</div>
		{/if}
	</div>
{:else}
	<p class="admin-list-empty">Aún no hay aplicaciones registradas.</p>
{/each}
