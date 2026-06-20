<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const dateFmt = new Intl.DateTimeFormat('es-ES', {
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	});

	function formatDate(ms: number): string {
		return dateFmt.format(new Date(ms));
	}

	// The id of the currently authenticated user (to mark "tú" in the list).
	let currentId = $derived($page.data.user?.id as number | undefined);
</script>

<svelte:head>
	<title>Usuarios · Jefe de Guerra</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-page-head">
	<h1>Usuarios</h1>
	<p class="lead">
		Gestiona las cuentas de oficiales. Cualquier usuario puede editar el contenido y
		crear o eliminar otras cuentas.
	</p>
</div>

{#if form?.scope === 'create' && form?.created}
	<div class="admin-msg ok" role="status">
		<svg class="msg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M20 6 9 17l-5-5" />
		</svg>
		<span>Usuario creado. Deberá cambiar su contraseña al iniciar sesión.</span>
	</div>
{/if}
{#if form?.scope === 'delete' && form?.deleted}
	<div class="admin-msg ok" role="status">
		<svg class="msg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M20 6 9 17l-5-5" />
		</svg>
		<span>
			{#if form?.self}
				Te eliminaste a ti mismo. Tu sesión seguirá activa hasta que cierres sesión.
			{:else}
				Usuario eliminado.
			{/if}
		</span>
	</div>
{/if}
{#if form?.scope === 'delete' && form?.error}
	<div class="admin-msg err" role="alert">
		<svg class="msg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="13" /><line x1="12" y1="16" x2="12" y2="16" />
		</svg>
		<span>{form.error}</span>
	</div>
{/if}

<div class="admin-card">
	<div class="admin-card-head">
		<h2>Cuentas</h2>
		<span class="badge">{data.users.length} {data.users.length === 1 ? 'usuario' : 'usuarios'}</span>
	</div>

	{#if data.users.length === 0}
		<div class="admin-list-empty">No hay usuarios todavía.</div>
	{:else}
		<div class="admin-list">
			{#each data.users as u (u.id)}
				<div class="admin-list-row" style="align-items: center;">
					<div class="admin-field" style="margin-bottom: 0;">
						<span class="field-label">Usuario</span>
						<div style="font-weight: 600; color: var(--color-silver);">
							{u.username}
							{#if currentId === u.id}
								<span class="badge">tú</span>
							{/if}
							{#if u.mustChange}
								<span class="badge">debe cambiar contraseña</span>
							{/if}
						</div>
					</div>
					<div class="admin-field" style="margin-bottom: 0; flex: 0 1 12rem;">
						<span class="field-label">Creado</span>
						<div style="color: var(--admin-muted);">{formatDate(u.createdAt)}</div>
					</div>
					<div class="admin-field admin-field-action" style="margin-bottom: 0;">
						<span class="field-label" style="visibility: hidden;">Acción</span>
						<form
							method="POST"
							action="?/delete"
							use:enhance={() => {
								return async ({ update }) => {
									await update();
								};
							}}
						>
							<input type="hidden" name="id" value={u.id} />
							<button
								type="submit"
								class="admin-btn danger"
								disabled={data.users.length <= 1}
								onclick={(e) => {
									if (!confirm(`¿Eliminar al usuario «${u.username}»?`)) e.preventDefault();
								}}
							>
								Eliminar
							</button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<div class="admin-card">
	<div class="admin-card-head">
		<h2>Crear usuario</h2>
	</div>

	{#if form?.scope === 'create' && form?.error}
		<div class="admin-msg err" role="alert">
			<svg class="msg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="13" /><line x1="12" y1="16" x2="12" y2="16" />
			</svg>
			<span>{form.error}</span>
		</div>
	{/if}

	<form method="POST" action="?/create" use:enhance>
		<div class="admin-row">
			<div class="admin-field">
				<label for="new-username">Usuario</label>
				<input
					id="new-username"
					name="username"
					type="text"
					autocomplete="off"
					autocapitalize="none"
					spellcheck="false"
					required
				/>
				<span class="hint">3-32 caracteres: letras, números, ., - o _.</span>
			</div>
			<div class="admin-field">
				<label for="new-password">Contraseña temporal</label>
				<input
					id="new-password"
					name="password"
					type="text"
					autocomplete="off"
					minlength="8"
					required
				/>
				<span class="hint">Mínimo 8 caracteres. El usuario deberá cambiarla al entrar.</span>
			</div>
		</div>

		<div class="admin-actions footer">
			<button type="submit" class="admin-btn">Crear usuario</button>
		</div>
	</form>
</div>

<style>
	/* Read-only column heading inside list rows (mirrors .admin-field label). */
	.field-label {
		display: block;
		font-weight: 600;
		font-size: 0.85rem;
		letter-spacing: 0.01em;
		color: var(--color-steel);
		margin-bottom: 0.35rem;
	}
</style>
