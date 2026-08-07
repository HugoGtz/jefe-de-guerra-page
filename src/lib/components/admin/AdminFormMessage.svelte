<script lang="ts">
	import { fade } from 'svelte/transition';

	/** Success/error feedback banner shared by admin forms (top-of-page or inline
	    next to the item that triggered it). */
	let { success, error }: { success?: string | null; error?: string | null } = $props();
</script>

{#if success}
	<div class="admin-msg ok" role="status" transition:fade={{ duration: 180 }}>
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
		<span>{success}</span>
	</div>
{/if}
{#if error}
	<div class="admin-msg err" role="alert" transition:fade={{ duration: 180 }}>
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
			<circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="13" /><line
				x1="12"
				y1="16"
				x2="12"
				y2="16"
			/>
		</svg>
		<span>{error}</span>
	</div>
{/if}
