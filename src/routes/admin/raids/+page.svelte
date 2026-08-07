<script lang="ts">
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { fade } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import AdminFormMessage from '$lib/components/admin/AdminFormMessage.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type BossRow = { key: string; name: string; defeated: boolean };

	// Per-raid editable boss list (name + defeated), keyed by raid id. `key` is
	// a client-only synthetic id (not submitted) so the {#each} below can key
	// by identity instead of index — required for the out:fade on Quitar to
	// animate the row you actually clicked instead of always the last one.
	// Initialised once from the load; further edits are user-driven.
	let bossesByRaid = $state<Record<string, BossRow[]>>(
		untrack(() =>
			Object.fromEntries(
				data.phases.flatMap((p) =>
					p.raids.map((r) => [
						r.id,
						r.bosses.map((b) => ({ key: crypto.randomUUID(), name: b.name, defeated: b.defeated }))
					])
				)
			)
		)
	);

	// `setBossesForRaid` REPLACES a raid's whole boss list on save, so a save
	// from another tab/officer (or this page's own invalidateAll after saving
	// a different raid) can silently be clobbered by our stale local copy.
	// Track which raids the user has actually touched locally, and re-sync
	// everything else from the server whenever `data` refreshes.
	let dirtyRaids = new SvelteSet<string>();
	function markDirty(raidId: string) {
		dirtyRaids.add(raidId);
	}

	$effect(() => {
		for (const phase of data.phases) {
			for (const raid of phase.raids) {
				if (dirtyRaids.has(raid.id)) continue;
				bossesByRaid[raid.id] = raid.bosses.map((b) => ({
					key: crypto.randomUUID(),
					name: b.name,
					defeated: b.defeated
				}));
			}
		}
	});

	// Once a raid's own save round-trips successfully, drop it from the dirty
	// set so it goes back to tracking the server (e.g. another officer's
	// later edit) instead of staying pinned to what we just submitted.
	$effect(() => {
		if (form?.scope === 'raid' && form.success && typeof form.id === 'string') {
			dirtyRaids.delete(form.id);
		}
	});

	function addBoss(raidId: string) {
		markDirty(raidId);
		bossesByRaid[raidId] = [
			...bossesByRaid[raidId],
			{ key: crypto.randomUUID(), name: '', defeated: false }
		];
	}
	function removeBoss(raidId: string, i: number) {
		markDirty(raidId);
		bossesByRaid[raidId] = bossesByRaid[raidId].filter((_, idx) => idx !== i);
	}

	// Per-form submitting state so a slow D1 write shows immediate feedback
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
	<title>Progreso de raid · Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-page-head">
	<h1>Progreso de raid</h1>
	<p class="lead">
		Edita fases, raids y jefes. El progreso de Fase 2 (SSC/TK) lo gobierna WarcraftLogs en cuanto
		hay al menos un kill registrado — lo que edites aquí para esos jefes solo se ve mientras no haya
		datos de WCL. Para Fase 1 (Karazhan/Gruul/Magtheridon) esto es la única fuente.
	</p>
</div>

{#if form?.id == null}
	<AdminFormMessage success={form?.success} error={form?.error} />
{/if}

{#each data.phases as phase (phase.id)}
	{@const phaseRowId = 'phase:' + phase.id}
	<form
		method="POST"
		action="?/updatePhase"
		use:enhance={() => trackSubmit(phaseRowId)}
		class="admin-card"
	>
		<input type="hidden" name="id" value={phase.id} />
		{#if form?.scope === 'phase' && form.id === phase.id}
			<AdminFormMessage success={form?.success} error={form?.error} />
		{/if}
		<div class="admin-card-head">
			<h2>{phase.name}</h2>
			<span class="badge">{phase.id}</span>
		</div>
		<div class="admin-row">
			<div class="admin-field">
				<label for="pname-{phase.id}">Nombre</label>
				<input id="pname-{phase.id}" name="name" type="text" value={phase.name} required />
			</div>
			<div class="admin-field">
				<label for="plabel-{phase.id}">Etiqueta</label>
				<input id="plabel-{phase.id}" name="label" type="text" value={phase.label} />
			</div>
		</div>
		<div class="admin-row">
			<div class="admin-field">
				<label for="pstatus-{phase.id}">Estado</label>
				<select id="pstatus-{phase.id}" name="status" value={phase.status}>
					<option value="upcoming">Próxima</option>
					<option value="in-progress">En progreso</option>
					<option value="completed">Completada</option>
				</select>
			</div>
			<div class="admin-field">
				<label for="pstatuslabel-{phase.id}">Etiqueta de estado</label>
				<input
					id="pstatuslabel-{phase.id}"
					name="statusLabel"
					type="text"
					value={phase.statusLabel}
				/>
			</div>
			<div class="admin-field">
				<label for="psort-{phase.id}">Orden</label>
				<input id="psort-{phase.id}" name="sort" type="number" value={phase.sort} />
			</div>
		</div>
		<div class="admin-actions footer">
			<button type="submit" class="admin-btn" disabled={pending.has(phaseRowId)}>
				{#if pending.has(phaseRowId)}
					<span class="admin-spinner" aria-hidden="true"></span>Guardando…
				{:else}
					Guardar fase
				{/if}
			</button>
		</div>
	</form>

	{#each phase.raids as raid (raid.id)}
		{@const raidRowId = 'raid:' + raid.id}
		<form
			method="POST"
			action="?/updateRaid"
			use:enhance={() => trackSubmit(raidRowId)}
			class="admin-card admin-nested"
		>
			<input type="hidden" name="id" value={raid.id} />
			<div class="admin-card-head">
				<h2>{raid.name}</h2>
				<span class="badge">{raid.id}</span>
			</div>
			{#if form?.scope === 'raid' && form.id === raid.id}
				<AdminFormMessage success={form?.success} error={form?.error} />
			{/if}
			<div class="admin-row">
				<div class="admin-field">
					<label for="rname-{raid.id}">Nombre</label>
					<input id="rname-{raid.id}" name="name" type="text" value={raid.name} required />
				</div>
				<div class="admin-field">
					<label for="rabbr-{raid.id}">Abreviatura</label>
					<input id="rabbr-{raid.id}" name="abbr" type="text" value={raid.abbr ?? ''} />
				</div>
				<div class="admin-field">
					<label for="rsort-{raid.id}">Orden</label>
					<input id="rsort-{raid.id}" name="sort" type="number" value={raid.sort} />
				</div>
			</div>

			<p class="hint">Jefes</p>
			<div class="admin-list">
				{#each bossesByRaid[raid.id] as boss, i (boss.key)}
					<div class="admin-list-row" out:fade={{ duration: 150 }}>
						<div class="admin-field">
							<label for="bname-{raid.id}-{i}">Nombre</label>
							<input
								id="bname-{raid.id}-{i}"
								name="bossName"
								type="text"
								bind:value={boss.name}
								oninput={() => markDirty(raid.id)}
							/>
						</div>
						<div class="admin-check">
							<input
								id="bdef-{raid.id}-{i}"
								type="checkbox"
								bind:checked={boss.defeated}
								onchange={() => markDirty(raid.id)}
							/>
							<label for="bdef-{raid.id}-{i}">Derrotado</label>
						</div>
						<input type="hidden" name="bossDefeated" value={boss.defeated} />
						<div class="admin-field admin-field-action">
							<label for="rmboss-{raid.id}-{i}" aria-hidden="true">Quitar</label>
							<button
								id="rmboss-{raid.id}-{i}"
								type="button"
								class="admin-btn danger"
								onclick={() => removeBoss(raid.id, i)}>Quitar</button
							>
						</div>
					</div>
				{:else}
					<p class="admin-list-empty">Sin jefes todavía.</p>
				{/each}
			</div>
			<div class="admin-actions">
				<button type="button" class="admin-btn secondary" onclick={() => addBoss(raid.id)}
					>+ Añadir jefe</button
				>
			</div>

			<div class="admin-actions footer">
				<button type="submit" class="admin-btn" disabled={pending.has(raidRowId)}>
					{#if pending.has(raidRowId)}
						<span class="admin-spinner" aria-hidden="true"></span>Guardando…
					{:else}
						Guardar raid
					{/if}
				</button>
			</div>
		</form>
	{/each}
{/each}

<p class="hint">
	Para agregar o eliminar una fase o un raid completo (p. ej. al abrir una fase nueva de contenido),
	ver la sección de D1 en <code>DEPLOY.md</code> — es un cambio manual y poco frecuente.
</p>
