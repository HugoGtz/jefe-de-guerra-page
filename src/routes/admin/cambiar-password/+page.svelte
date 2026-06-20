<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();
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
	{#if form?.error}
		<div class="admin-msg err" role="alert">
			<svg class="msg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="13" /><line x1="12" y1="16" x2="12" y2="16" />
			</svg>
			<span>{form.error}</span>
		</div>
	{/if}

	<form method="POST" use:enhance>
		<div class="admin-field">
			<label for="current">Contraseña actual</label>
			<input
				id="current"
				name="current"
				type="password"
				autocomplete="current-password"
				required
			/>
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
			<button type="submit" class="admin-btn">Guardar contraseña</button>
		</div>
	</form>
</div>
