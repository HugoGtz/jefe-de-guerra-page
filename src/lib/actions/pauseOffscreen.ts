import type { Action } from 'svelte/action';

/**
 * Svelte action: toggles `.is-offscreen` on the node while it's outside the
 * viewport, so the shared `.is-offscreen` rule (app.css) can pause any
 * continuous CSS `animation` running on it or its descendants. Purely a perf
 * optimization for the always-on decorative loops (shine sweeps, pulses,
 * beams) — doesn't affect reduced-motion handling, which already zeroes
 * those animations globally.
 *
 *   <section class="hero" use:pauseOffscreen>
 */
export const pauseOffscreen: Action<HTMLElement, void> = (node) => {
	const supported = typeof window !== 'undefined' && 'IntersectionObserver' in window;
	if (!supported) return {};

	const observer = new IntersectionObserver(
		([entry]) => {
			node.classList.toggle('is-offscreen', !entry.isIntersecting);
		},
		{ threshold: 0 }
	);
	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
};
