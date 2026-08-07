<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';
	import AdminFormMessage from '$lib/components/admin/AdminFormMessage.svelte';

	let { form, data }: { form: ActionData; data: PageData } = $props();

	let submitting = $state(false);
</script>

<svelte:head>
	<title>Cambiar contraseña · Jefe de Guerra</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-page-head">
	<h1>Cambiar contraseña</h1>
	<p class="lead">
		{#if data.mustChange}
			Por seguridad, debes establecer una nueva contraseña antes de continuar.
		{:else}
			Actualiza tu contraseña de acceso al panel.
		{/if}
	</p>
</div>

<div class="admin-card" style="max-width: 32rem;">
	<AdminFormMessage error={form?.error} />

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
		<div class="admin-field">
			<label for="current">Contraseña actual</label>
			<input id="current" name="current" type="password" autocomplete="current-password" required />
		</div>

		<div class="admin-field">
			<label for="next">Nueva contraseña</label>
			<input
				id="next"
				name="next"
				type="password"
				autocomplete="new-password"
				minlength="8"
				required
			/>
			<span class="hint">Mínimo 8 caracteres. Usa algo difícil de adivinar.</span>
		</div>

		<div class="admin-field">
			<label for="confirm">Confirmar nueva contraseña</label>
			<input
				id="confirm"
				name="confirm"
				type="password"
				autocomplete="new-password"
				minlength="8"
				required
			/>
		</div>

		<div class="admin-actions footer">
			<button type="submit" class="admin-btn" disabled={submitting}>
				{#if submitting}
					<span class="admin-spinner" aria-hidden="true"></span>Guardando…
				{:else}
					Guardar contraseña
				{/if}
			</button>
		</div>
	</form>
</div>
