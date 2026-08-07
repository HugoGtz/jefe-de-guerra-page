<script lang="ts">
	/**
	 * Decorative torch-corridor strip for the Phase 2 raid progress section
	 * (see `$lib/three/TorchCorridorScene.ts`). One torch per boss, lit in
	 * order as bosses fall — purely additive polish layered above the
	 * existing accessible markup (stats/progress bars/raid cards), which
	 * already conveys the same numbers in text. No-op under
	 * prefers-reduced-motion or when there's nothing to show (total <= 0).
	 */
	import { getReducedMotion } from '$lib/utils/reducedMotion';

	let { litCount, total }: { litCount: number; total: number } = $props();

	let canvasEl = $state<HTMLCanvasElement>();
	const reduced = getReducedMotion();

	$effect(() => {
		if (reduced || !canvasEl || total <= 0) return;
		const el = canvasEl;

		let cancelled = false;
		let observer: IntersectionObserver | null = null;
		let scene: import('$lib/three/TorchCorridorScene').TorchCorridorScene | null = null;

		import('$lib/three/TorchCorridorScene').then(({ TorchCorridorScene }) => {
			if (cancelled) return;
			scene = new TorchCorridorScene(el, { total });
			scene.setLit(litCount);

			if ('IntersectionObserver' in window) {
				observer = new IntersectionObserver(
					(entries) => {
						if (entries[0]?.isIntersecting) scene?.start();
						else scene?.stop();
					},
					{ threshold: 0.15 }
				);
				observer.observe(el);
			} else {
				scene.start();
			}
		});

		return () => {
			cancelled = true;
			observer?.disconnect();
			scene?.dispose();
			scene = null;
		};
	});
</script>

{#if !reduced && total > 0}
	<div class="torch-corridor" aria-hidden="true">
		<canvas bind:this={canvasEl}></canvas>
	</div>
{/if}

<style>
	.torch-corridor {
		position: relative;
		width: 100%;
		max-width: 46rem;
		height: clamp(80px, 12vw, 130px);
		margin: 0 auto var(--spacing-2xl);
	}
	.torch-corridor canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		pointer-events: none;
	}
</style>
