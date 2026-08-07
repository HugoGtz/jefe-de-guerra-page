<script lang="ts">
	/**
	 * Class/spec icon <img> with the standard lazy/async attributes and a square
	 * `size`. The caller resolves `src` (via `specOrClassIcon`) and decides whether
	 * to render this or a first-letter fallback, so each site keeps its own avatar
	 * styling — this just standardizes the image element itself.
	 */
	let {
		src,
		size,
		alt = '',
		class: className = '',
		loading = 'lazy'
	}: {
		src: string;
		size: number;
		alt?: string;
		class?: string;
		/** Above-the-fold icons (e.g. the player hero) should pass 'eager'. */
		loading?: 'lazy' | 'eager';
	} = $props();
</script>

<img class={className} {src} {alt} width={size} height={size} {loading} decoding="async" />
