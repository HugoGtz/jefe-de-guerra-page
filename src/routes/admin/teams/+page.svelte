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
	<title>Equipos (Cores) · Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-page-head">
	<h1>Equipos (Cores)</h1>
	<p class="lead">
		Gestiona los rosters de raid: horario, progreso de SSC y TK, reclutamiento y orden de aparición.
	</p>
</div>

{#if form?.id == null}
	<AdminFormMessage success={form?.success} error={form?.error} />
{/if}

{#each data.teams as team (team.id)}
	<form
		method="POST"
		action="?/update"
		use:enhance={() => trackSubmit(team.id)}
		class="admin-card"
		out:fade={{ duration: 150 }}
	>
		<input type="hidden" name="id" value={team.id} />
		{#if form?.id === team.id}
			<AdminFormMessage success={form?.success} error={form?.error} />
		{/if}
		<div class="admin-card-head">
			<h2>{team.name}</h2>
			<span class="badge">{team.id}</span>
		</div>

		<div class="admin-field">
			<label for="name-{team.id}">Nombre</label>
			<input id="name-{team.id}" name="name" type="text" value={team.name} required />
		</div>

		<div class="admin-row">
			<div class="admin-field">
				<label for="days-{team.id}">Días</label>
				<input id="days-{team.id}" name="scheduleDays" type="text" value={team.schedule.days} />
			</div>
			<div class="admin-field">
				<label for="time-{team.id}">Hora</label>
				<input id="time-{team.id}" name="scheduleTime" type="text" value={team.schedule.time} />
			</div>
			<div class="admin-field">
				<label for="tz-{team.id}">Zona</label>
				<input
					id="tz-{team.id}"
					name="scheduleTimezone"
					type="text"
					value={team.schedule.timezone}
				/>
			</div>
		</div>

		<div class="admin-row">
			<div class="admin-field">
				<label for="ssck-{team.id}">SSC derrotados</label>
				<input id="ssck-{team.id}" name="sscKills" type="number" min="0" value={team.ssc.kills} />
			</div>
			<div class="admin-field">
				<label for="ssct-{team.id}">SSC total</label>
				<input id="ssct-{team.id}" name="sscTotal" type="number" min="0" value={team.ssc.total} />
			</div>
			<div class="admin-field">
				<label for="tkk-{team.id}">TK derrotados</label>
				<input id="tkk-{team.id}" name="tkKills" type="number" min="0" value={team.tk.kills} />
			</div>
			<div class="admin-field">
				<label for="tkt-{team.id}">TK total</label>
				<input id="tkt-{team.id}" name="tkTotal" type="number" min="0" value={team.tk.total} />
			</div>
		</div>

		<div class="admin-row">
			<div class="admin-field">
				<label for="wcl-{team.id}">WCL Guild ID (opcional)</label>
				<input
					id="wcl-{team.id}"
					name="wclGuildId"
					type="number"
					min="0"
					value={team.wclGuildId ?? ''}
				/>
			</div>
			<div class="admin-field">
				<label for="wcltag-{team.id}">WCL Tag ID (opcional)</label>
				<input
					id="wcltag-{team.id}"
					name="wclTagId"
					type="number"
					min="0"
					value={team.wclTagId ?? ''}
				/>
			</div>
			<div class="admin-field">
				<label for="sort-{team.id}">Orden</label>
				<input id="sort-{team.id}" name="sort" type="number" value={data.teams.indexOf(team)} />
			</div>
		</div>

		<div class="admin-field">
			<label for="note-{team.id}">Nota (opcional)</label>
			<input id="note-{team.id}" name="note" type="text" value={team.note ?? ''} />
		</div>

		<div class="admin-check">
			<input id="rec-{team.id}" name="recruiting" type="checkbox" checked={team.recruiting} />
			<label for="rec-{team.id}">Reclutando</label>
		</div>

		<div class="admin-actions footer">
			<button type="submit" class="admin-btn" disabled={pending.has(team.id)}>
				{#if pending.has(team.id)}
					<span class="admin-spinner" aria-hidden="true"></span>Guardando…
				{:else}
					Guardar
				{/if}
			</button>
			<button
				type="submit"
				formaction="?/delete"
				class="admin-btn danger"
				disabled={pending.has(team.id)}
				onclick={(e) => {
					if (!confirm(`¿Eliminar el equipo «${team.name}»?`)) e.preventDefault();
				}}
			>
				{#if pending.has(team.id)}
					<span class="admin-spinner" aria-hidden="true"></span>Eliminando…
				{:else}
					Eliminar
				{/if}
			</button>
		</div>
	</form>
{/each}

<h2>Añadir equipo nuevo</h2>
<form method="POST" action="?/create" use:enhance={() => trackSubmit('create')} class="admin-card">
	<div class="admin-row">
		<div class="admin-field">
			<label for="new-id">Identificador (p. ej. core-8)</label>
			<input id="new-id" name="id" type="text" required />
			<span class="hint">Solo minúsculas, números y guiones.</span>
		</div>
		<div class="admin-field">
			<label for="new-name">Nombre</label>
			<input id="new-name" name="name" type="text" required />
		</div>
	</div>
	<div class="admin-row">
		<div class="admin-field">
			<label for="new-days">Días</label>
			<input id="new-days" name="scheduleDays" type="text" />
		</div>
		<div class="admin-field">
			<label for="new-time">Hora</label>
			<input id="new-time" name="scheduleTime" type="text" />
		</div>
		<div class="admin-field">
			<label for="new-tz">Zona</label>
			<input id="new-tz" name="scheduleTimezone" type="text" value="ST" />
		</div>
	</div>
	<div class="admin-row">
		<div class="admin-field">
			<label for="new-ssck">SSC derrotados</label>
			<input id="new-ssck" name="sscKills" type="number" min="0" value="0" />
		</div>
		<div class="admin-field">
			<label for="new-ssct">SSC total</label>
			<input id="new-ssct" name="sscTotal" type="number" min="0" value="6" />
		</div>
		<div class="admin-field">
			<label for="new-tkk">TK derrotados</label>
			<input id="new-tkk" name="tkKills" type="number" min="0" value="0" />
		</div>
		<div class="admin-field">
			<label for="new-tkt">TK total</label>
			<input id="new-tkt" name="tkTotal" type="number" min="0" value="4" />
		</div>
	</div>
	<div class="admin-row">
		<div class="admin-field">
			<label for="new-wcl">WCL Guild ID (opcional)</label>
			<input id="new-wcl" name="wclGuildId" type="number" min="0" />
		</div>
		<div class="admin-field">
			<label for="new-wcltag">WCL Tag ID (opcional)</label>
			<input id="new-wcltag" name="wclTagId" type="number" min="0" />
		</div>
		<div class="admin-field">
			<label for="new-sort">Orden</label>
			<input id="new-sort" name="sort" type="number" value={data.teams.length} />
		</div>
	</div>
	<div class="admin-field">
		<label for="new-note">Nota (opcional)</label>
		<input id="new-note" name="note" type="text" />
	</div>
	<div class="admin-check">
		<input id="new-rec" name="recruiting" type="checkbox" />
		<label for="new-rec">Reclutando</label>
	</div>
	<div class="admin-actions footer">
		<button type="submit" class="admin-btn" disabled={pending.has('create')}>
			{#if pending.has('create')}
				<span class="admin-spinner" aria-hidden="true"></span>Añadiendo…
			{:else}
				Crear equipo
			{/if}
		</button>
	</div>
</form>
