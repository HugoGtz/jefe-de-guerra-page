<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Acceso de oficiales · Jefe de Guerra</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-login-page">
	<div class="admin-login-card">
		<div class="login-brand">
			<span class="mark">JG</span>
			<div>
				<h1>Acceso de oficiales</h1>
				<p class="sub">Introduce la contraseña para administrar el contenido del sitio.</p>
			</div>
		</div>

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
				<label for="password">Contraseña</label>
				<input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					required
				/>
			</div>

			<button type="submit" class="admin-btn">Entrar</button>
		</form>
	</div>
</div>
