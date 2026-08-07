<script lang="ts">
	import { enhance } from '$app/forms';
	import { SvelteSet } from 'svelte/reactivity';
	import { fade } from 'svelte/transition';
	import AdminFormMessage from '$lib/components/admin/AdminFormMessage.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const rateLimitPct = $derived(
		data.rateLimit
			? Math.round((data.rateLimit.pointsSpentThisHour / data.rateLimit.limitPerHour) * 100)
			: null
	);
	function formatResetIn(seconds: number): string {
		const minutes = Math.round(seconds / 60);
		return minutes <= 1 ? 'menos de 1 min' : `${minutes} min`;
	}

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
	<title>Estado de WarcraftLogs · Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-page-head">
	<h1>Estado de WarcraftLogs</h1>
	<p class="lead">
		Forzar un refresco cuando algo se ve desactualizado después de una noche de raid, y corregir a
		mano un registro incorrecto del histórico de jefes derrotados.
	</p>
</div>

<div class="admin-card">
	<h2>Cuota de la API</h2>
	{#if data.rateLimit}
		<p class="hint">
			Puntos usados esta hora — si esto se acerca al 100%, las próximas cargas del sitio empiezan a
			fallar y caen al caché/estático hasta que se reinicie la cuota.
		</p>
		<div class="admin-list-row" style="align-items: center;">
			<div class="admin-field" style="margin-bottom: 0; flex: 1 1 12rem;">
				<span class="field-label">Uso</span>
				<div style="font-weight: 600; color: var(--color-silver);">
					{data.rateLimit.pointsSpentThisHour} / {data.rateLimit.limitPerHour} ({rateLimitPct}%)
				</div>
			</div>
			<div class="admin-field" style="margin-bottom: 0; flex: 1 1 12rem;">
				<span class="field-label">Se reinicia en</span>
				<div style="color: var(--admin-muted);">{formatResetIn(data.rateLimit.pointsResetIn)}</div>
			</div>
		</div>
	{:else}
		<p class="admin-list-empty">No se pudo consultar la cuota (¿credenciales de WCL ausentes?).</p>
	{/if}
</div>

<div class="admin-card">
	<h2>Refrescar ahora</h2>
	<p class="hint">
		Borra el dato cacheado; la próxima vez que alguien cargue el sitio se vuelve a pedir a
		WarcraftLogs. No dispara nada de inmediato.
	</p>
	<div class="admin-list">
		{#each data.cacheKeys as ck (ck.key)}
			<form
				method="POST"
				action="?/refresh"
				use:enhance={() => trackSubmit(ck.key)}
				class="admin-list-row"
			>
				<span class="admin-field-action" style="flex:1">{ck.label}</span>
				<input type="hidden" name="key" value={ck.key} />
				<button type="submit" class="admin-btn secondary" disabled={pending.has(ck.key)}>
					{#if pending.has(ck.key)}
						<span class="admin-spinner" aria-hidden="true"></span>Refrescando…
					{:else}
						Refrescar
					{/if}
				</button>
				{#if form?.scope === 'refresh' && form.key === ck.key}
					<div style="flex: 1 1 100%;">
						<AdminFormMessage success={form?.success} error={form?.error} />
					</div>
				{/if}
			</form>
		{/each}
	</div>
</div>

<div class="admin-card">
	<h2>Histórico de jefes derrotados</h2>
	<span class="badge">{data.tier}</span>
	<p class="hint">
		Cada fila es un jefe de Fase 2 confirmado como derrotado para ese core, guardado de forma
		permanente para que no desaparezca del progreso mostrado. Elimina una fila solo si es un error
		real.
	</p>
	<div class="admin-list">
		{#each data.ledger as row (row.coreWclGuildId + '::' + row.boss)}
			{@const rowId = row.coreWclGuildId + '::' + row.boss}
			<form
				method="POST"
				action="?/deleteLedgerRow"
				use:enhance={() => trackSubmit(rowId)}
				class="admin-list-row"
				out:fade={{ duration: 150 }}
			>
				<input type="hidden" name="coreWclGuildId" value={row.coreWclGuildId} />
				<input type="hidden" name="boss" value={row.boss} />
				<input type="hidden" name="tier" value={row.tier} />
				<span class="admin-field-action" style="flex:1">
					<strong>{row.coreName}</strong> — {row.boss}
				</span>
				<button
					type="submit"
					class="admin-btn danger"
					disabled={pending.has(rowId)}
					onclick={(e) => {
						if (!confirm(`¿Eliminar el registro de «${row.boss}» (${row.coreName})?`))
							e.preventDefault();
					}}
				>
					{#if pending.has(rowId)}
						<span class="admin-spinner" aria-hidden="true"></span>Eliminando…
					{:else}
						Eliminar
					{/if}
				</button>
				{#if form?.scope === 'ledger' && form.coreWclGuildId === row.coreWclGuildId && form.boss === row.boss}
					<div style="flex: 1 1 100%;">
						<AdminFormMessage success={form?.success} error={form?.error} />
					</div>
				{/if}
			</form>
		{:else}
			<p class="admin-list-empty">
				Sin registros todavía — se llenará con el próximo fetch en vivo.
			</p>
		{/each}
	</div>
</div>
