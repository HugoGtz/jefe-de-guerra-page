<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	import type { PageData } from './$types';
	import AdminFormMessage from '$lib/components/admin/AdminFormMessage.svelte';

	let { form, data }: { form: ActionData; data: PageData } = $props();

	let submitting = $state(false);
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
				<p class="sub">
					Introduce tu usuario y contraseña para administrar el contenido del sitio.
				</p>
			</div>
		</div>

		{#if data.notice}
			<div class="admin-msg ok" role="status">
				<svg
					class="msg-ico"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M20 6 9 17l-5-5" />
				</svg>
				<span>Contraseña actualizada. Inicia sesión de nuevo.</span>
			</div>
		{/if}

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
				<label for="username">Usuario</label>
				<input
					id="username"
					name="username"
					type="text"
					autocomplete="username"
					autocapitalize="none"
					spellcheck="false"
					required
				/>
			</div>

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

			<button type="submit" class="admin-btn" disabled={submitting}>
				{#if submitting}
					<span class="admin-spinner" aria-hidden="true"></span>Entrando…
				{:else}
					Entrar
				{/if}
			</button>
		</form>
	</div>
</div>
