import type { Action } from 'svelte/action';
import { getReducedMotion } from '$lib/utils/reducedMotion';

/**
 * Svelte action: drives a horizontal progress bar from page scroll position.
 * Sets `transform: scaleX()` (0→1) on the node via requestAnimationFrame for
 * 60fps, jank-free updates. The node should have `transform-origin: left`.
 *
 * SSR-safe. Under prefers-reduced-motion the bar is shown full (scaleX(1))
 * and no scroll listener is attached.
 *
 *   <div class="bar" use:scrollProgress></div>
 */
export const scrollProgress: Action<HTMLElement> = (node) => {
	if (getReducedMotion() || typeof window === 'undefined') {
		node.style.transform = 'scaleX(1)';
		return;
	}

	let ticking = false;
	let frame = 0;

	const apply = () => {
		ticking = false;
		const doc = document.documentElement;
		const scrollable = doc.scrollHeight - window.innerHeight;
		const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
		const clamped = Math.min(1, Math.max(0, progress));
		node.style.transform = `scaleX(${clamped.toFixed(4)})`;
	};

	const onScroll = () => {
		if (!ticking) {
			ticking = true;
			frame = requestAnimationFrame(apply);
		}
	};

	node.style.transformOrigin = 'left center';
	node.style.willChange = 'transform';
	apply();

	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', onScroll, { passive: true });

	return {
		destroy() {
			cancelAnimationFrame(frame);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		}
	};
};
