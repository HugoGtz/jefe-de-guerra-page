<script lang="ts">
	/**
	 * One-shot celebration particle burst (see `$lib/three/SparkBurstScene.ts`).
	 * Drop it into a `position: relative` container — it fills that container,
	 * plays once on mount, then unmounts itself. No-op entirely under
	 * prefers-reduced-motion (never creates a WebGL context).
	 *
	 *   <div style="position: relative;">
	 *     ...content...
	 *     {#if celebrate}<SparkBurst onDone={() => (celebrate = false)} />{/if}
	 *   </div>
	 */
	import { getReducedMotion } from '$lib/utils/reducedMotion';

	let { onDone }: { onDone?: () => void } = $props();

	let canvasEl = $state<HTMLCanvasElement>();
	let alive = $state(true);
	let burst: import('$lib/three/SparkBurstScene').SparkBurstScene | null = null;

	const reduced = getReducedMotion();

	$effect(() => {
		if (reduced || !canvasEl) {
			if (reduced) {
				alive = false;
				onDone?.();
			}
			return;
		}

		let cancelled = false;
		import('$lib/three/SparkBurstScene').then(({ SparkBurstScene }) => {
			if (cancelled || !canvasEl) return;
			burst = new SparkBurstScene(canvasEl);
			burst.play(() => {
				alive = false;
				onDone?.();
			});
		});

		return () => {
			cancelled = true;
			burst?.dispose();
			burst = null;
		};
	});
</script>

{#if alive && !reduced}
	<canvas bind:this={canvasEl} class="spark-burst" aria-hidden="true"></canvas>
{/if}

<style>
	.spark-burst {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
</style>
