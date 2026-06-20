<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const g = $derived(data.guild);
	// Prefer values echoed back on a failed submit, else the loaded guild data.
	const v = $derived(form?.values);
</script>

<svelte:head>
	<title>Identidad y horario · Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-page-head">
	<h1>Identidad y horario</h1>
	<p class="lead">Datos de cabecera de la hermandad, el horario principal de raid y los textos de presentación.</p>
</div>

{#if !g && !v}
	<div class="admin-msg err" role="alert">
		<svg class="msg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="13" /><line x1="12" y1="16" x2="12" y2="16" />
		</svg>
		<span>No hay datos de hermandad en la base de datos todavía.</span>
	</div>
{/if}

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
		<h2>Identidad</h2>
		<div class="admin-field">
			<label for="name">Nombre</label>
			<input id="name" name="name" type="text" value={v?.name ?? g?.name ?? ''} required />
		</div>
		<div class="admin-field">
			<label for="motto">Lema</label>
			<input id="motto" name="motto" type="text" value={v?.motto ?? g?.motto ?? ''} required />
		</div>
		<div class="admin-field">
			<label for="badge">Badge (facción · servidor · juego)</label>
			<input id="badge" name="badge" type="text" value={v?.badge ?? g?.badge ?? ''} required />
		</div>
		<div class="admin-row">
			<div class="admin-field">
				<label for="faction">Facción</label>
				<input id="faction" name="faction" type="text" value={v?.faction ?? g?.faction ?? ''} required />
			</div>
			<div class="admin-field">
				<label for="server">Servidor</label>
				<input id="server" name="server" type="text" value={v?.server ?? g?.server ?? ''} required />
			</div>
			<div class="admin-field">
				<label for="game">Juego</label>
				<input id="game" name="game" type="text" value={v?.game ?? g?.game ?? ''} required />
			</div>
		</div>
	</div>

	<div class="admin-card">
		<h2>Horario de raid</h2>
		<div class="admin-row">
			<div class="admin-field">
				<label for="scheduleDays">Días</label>
				<input id="scheduleDays" name="scheduleDays" type="text" value={v?.scheduleDays ?? g?.schedule.days ?? ''} required />
			</div>
			<div class="admin-field">
				<label for="scheduleTime">Hora</label>
				<input id="scheduleTime" name="scheduleTime" type="text" value={v?.scheduleTime ?? g?.schedule.time ?? ''} required />
			</div>
			<div class="admin-field">
				<label for="scheduleTimezone">Zona horaria</label>
				<input id="scheduleTimezone" name="scheduleTimezone" type="text" value={v?.scheduleTimezone ?? g?.schedule.timezone ?? ''} required />
			</div>
		</div>
		<div class="admin-field">
			<label for="scheduleNote">Nota (opcional)</label>
			<input id="scheduleNote" name="scheduleNote" type="text" value={v?.scheduleNote ?? g?.schedule.note ?? ''} />
		</div>
	</div>

	<div class="admin-card">
		<h2>Quiénes somos</h2>
		<div class="admin-field">
			<label for="who">Párrafos (uno por línea)</label>
			<textarea id="who" name="who">{v?.who ?? (g?.aboutWhoWeAre ?? []).join('\n')}</textarea>
			<span class="hint">Se permite HTML básico (p. ej. &lt;strong&gt;). Una línea = un párrafo.</span>
		</div>
	</div>

	<div class="admin-card">
		<h2>Ambiente</h2>
		<div class="admin-field">
			<label for="vibe">Párrafos (uno por línea)</label>
			<textarea id="vibe" name="vibe">{v?.vibe ?? (g?.aboutVibe ?? []).join('\n')}</textarea>
		</div>
	</div>

	<div class="admin-actions footer">
		<button type="submit" class="admin-btn">Guardar cambios</button>
	</div>
</form>
