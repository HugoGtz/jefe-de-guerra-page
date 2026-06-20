<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import type { RaidNight } from '$lib/data/community';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const v = $derived(form?.values);
	const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

	// Initialised once from the initial load; further edits are user-driven.
	let nights = $state<RaidNight[]>(
		untrack(() =>
			(data.raidNights ?? []).map((n) => ({
				team: n.team ?? '',
				weekday: n.weekday,
				time: n.time
			}))
		)
	);

	function addNight() {
		nights = [...nights, { team: '', weekday: 1, time: '' }];
	}
	function removeNight(i: number) {
		nights = nights.filter((_, idx) => idx !== i);
	}
</script>

<svelte:head>
	<title>Comunidad · Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-page-head">
	<h1>Comunidad</h1>
	<p class="lead">Configura el widget de Discord, la zona horaria de referencia y el calendario de noches de raid.</p>
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
		<h2>Ajustes generales</h2>
		<div class="admin-row">
			<div class="admin-field">
				<label for="discordServerId">ID del servidor de Discord</label>
				<input id="discordServerId" name="discordServerId" type="text" value={v?.discordServerId ?? data.meta?.discordServerId ?? ''} />
				<span class="hint">Para el widget embebido. Déjalo vacío para ocultarlo.</span>
			</div>
			<div class="admin-field">
				<label for="raidTimezone">Zona horaria de raid</label>
				<input id="raidTimezone" name="raidTimezone" type="text" value={v?.raidTimezone ?? data.meta?.raidTimezone ?? 'ST'} />
			</div>
		</div>
	</div>

	<div class="admin-card">
		<h2>Noches de raid</h2>
		<p class="hint">El equipo es opcional. El día es 0 = Domingo … 6 = Sábado. La hora va en formato HH:MM (24h).</p>
		<div class="admin-list">
			{#each nights as night, i (i)}
				<div class="admin-list-row">
					<div class="admin-field">
						<label for="nteam-{i}">Equipo (opcional)</label>
						<input id="nteam-{i}" name="nightTeam" type="text" bind:value={night.team} />
					</div>
					<div class="admin-field">
						<label for="nday-{i}">Día</label>
						<select id="nday-{i}" name="nightWeekday" bind:value={night.weekday}>
							{#each weekdayNames as name, idx (idx)}
								<option value={idx}>{name}</option>
							{/each}
						</select>
					</div>
					<div class="admin-field">
						<label for="ntime-{i}">Hora (HH:MM)</label>
						<input id="ntime-{i}" name="nightTime" type="text" placeholder="19:00" bind:value={night.time} />
					</div>
					<div class="admin-field admin-field-action">
						<label for="rm-night-{i}" aria-hidden="true">Quitar</label>
						<button id="rm-night-{i}" type="button" class="admin-btn danger" onclick={() => removeNight(i)}>Quitar</button>
					</div>
				</div>
			{:else}
				<p class="admin-list-empty">Aún no hay noches de raid. Añade la primera abajo.</p>
			{/each}
		</div>
		<div class="admin-actions">
			<button type="button" class="admin-btn secondary" onclick={addNight}>+ Añadir noche</button>
		</div>
	</div>

	<div class="admin-actions footer">
		<button type="submit" class="admin-btn">Guardar cambios</button>
	</div>
</form>
