<script lang="ts">
	import { page } from '$app/stores';

	const status = $derived($page.status);
	const message = $derived($page.error?.message ?? 'Algo salió mal');
</script>

<svelte:head>
	<title>{status} · Jefe de Guerra</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="err">
	<div class="err__inner">
		<img src="/logo.webp" alt="" width="180" height="155" class="err__logo" />
		<p class="err__code text-lava-glow">{status}</p>
		<h1 class="err__title font-display text-engraved">Ruta perdida en la niebla</h1>
		<p class="err__msg">{message}.</p>
		<a href="/" class="err__home">Volver al estandarte</a>
	</div>
</main>

<style>
	.err {
		min-height: 100svh;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 4rem var(--spacing-2xl);
	}
	.err__inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		max-width: 32rem;
	}
	.err__logo {
		width: min(45vw, 180px);
		height: auto;
		filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.6));
		opacity: 0.92;
	}
	.err__code {
		font-family: var(--font-display);
		font-size: clamp(3rem, 14vw, 6rem);
		font-weight: 900;
		line-height: 1;
		margin: var(--spacing-xl) 0 0;
	}
	.err__title {
		font-size: clamp(1.4rem, 5vw, 2.2rem);
		text-transform: uppercase;
		letter-spacing: var(--tracking-heading);
		margin: var(--spacing-xs) 0 0;
	}
	.err__msg {
		color: var(--color-steel);
		margin: var(--spacing-lg) 0 var(--spacing-3xl);
	}
	.err__home {
		display: inline-flex;
		align-items: center;
		padding: var(--spacing-md) var(--spacing-3xl);
		border-radius: var(--radius-sm);
		background-color: var(--color-blood);
		color: var(--color-silver);
		font-family: var(--font-display);
		font-weight: 700;
		letter-spacing: var(--tracking-heading);
		text-transform: uppercase;
		text-decoration: none;
		border: 1px solid color-mix(in srgb, var(--color-steel) 40%, transparent);
		transition:
			transform 0.2s ease,
			box-shadow 0.25s ease;
	}
	.err__home:hover {
		transform: translateY(-2px);
		box-shadow: 0 0 16px rgba(255, 59, 33, 0.45);
	}
	@media (prefers-reduced-motion: reduce) {
		.err__home:hover {
			transform: none;
		}
	}
</style>
