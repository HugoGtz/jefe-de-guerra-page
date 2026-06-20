<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Equipos (Cores) · Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-page-head">
	<h1>Equipos (Cores)</h1>
	<p class="lead">Gestiona los rosters de raid: horario, progreso de SSC y TK, reclutamiento y orden de aparición.</p>
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

{#each data.teams as team (team.id)}
	<form method="POST" action="?/update" use:enhance class="admin-card">
		<input type="hidden" name="id" value={team.id} />
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
				<input id="tz-{team.id}" name="scheduleTimezone" type="text" value={team.schedule.timezone} />
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
				<input id="wcl-{team.id}" name="wclGuildId" type="number" min="0" value={team.wclGuildId ?? ''} />
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
			<button type="submit" class="admin-btn">Guardar</button>
			<button type="submit" formaction="?/delete" class="admin-btn danger">Eliminar</button>
		</div>
	</form>
{/each}

<h2>Añadir equipo nuevo</h2>
<form method="POST" action="?/create" use:enhance class="admin-card">
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
		<button type="submit" class="admin-btn">Crear equipo</button>
	</div>
</form>
