<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { SvelteSet } from 'svelte/reactivity';
	import { fade } from 'svelte/transition';
	import AdminFormMessage from '$lib/components/admin/AdminFormMessage.svelte';
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
	<title>Usuarios · Jefe de Guerra</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-page-head">
	<h1>Usuarios</h1>
	<p class="lead">
		Gestiona las cuentas de oficiales. Cualquier usuario puede editar el contenido y crear o
		eliminar otras cuentas.
	</p>
</div>

{#if form?.id == null}
	<AdminFormMessage
		success={form?.scope === 'create' && form?.created
			? 'Usuario creado. Deberá cambiar su contraseña al iniciar sesión.'
			: undefined}
		error={form?.error}
	/>
{/if}

<div class="admin-card">
	<div class="admin-card-head">
		<h2>Cuentas</h2>
		<span class="badge">{data.users.length} {data.users.length === 1 ? 'usuario' : 'usuarios'}</span
		>
	</div>

	{#if data.users.length === 0}
		<div class="admin-list-empty">No hay usuarios todavía.</div>
	{:else}
		<div class="admin-list">
			{#each data.users as u (u.id)}
				<div class="admin-list-row" style="align-items: center;" out:fade={{ duration: 150 }}>
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
						<form method="POST" action="?/delete" use:enhance={() => trackSubmit(String(u.id))}>
							<input type="hidden" name="id" value={u.id} />
							<button
								type="submit"
								class="admin-btn danger"
								disabled={data.users.length <= 1 || pending.has(String(u.id))}
								onclick={(e) => {
									if (!confirm(`¿Eliminar al usuario «${u.username}»?`)) e.preventDefault();
								}}
							>
								{#if pending.has(String(u.id))}
									<span class="admin-spinner" aria-hidden="true"></span>Eliminando…
								{:else}
									Eliminar
								{/if}
							</button>
						</form>
					</div>
				</div>
				{#if form?.id === u.id}
					<AdminFormMessage
						success={form?.scope === 'delete' && form?.deleted
							? form?.self
								? 'Te eliminaste a ti mismo. Tu sesión seguirá activa hasta que cierres sesión.'
								: 'Usuario eliminado.'
							: undefined}
						error={form?.error}
					/>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<div class="admin-card">
	<div class="admin-card-head">
		<h2>Crear usuario</h2>
	</div>

	<form method="POST" action="?/create" use:enhance={() => trackSubmit('create')}>
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
			<button type="submit" class="admin-btn" disabled={pending.has('create')}>
				{#if pending.has('create')}
					<span class="admin-spinner" aria-hidden="true"></span>Creando…
				{:else}
					Crear usuario
				{/if}
			</button>
		</div>
	</form>
</div>

<style>
	/* Read-only column heading inside list rows (mirrors .admin-field label). */
	.field-label {
		display: block;
		font-weight: 600;
		font-size: var(--text-sm);
		letter-spacing: var(--tracking-snug);
		color: var(--color-steel);
		margin-bottom: var(--spacing-2xs);
	}
</style>
