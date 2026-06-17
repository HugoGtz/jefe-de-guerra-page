import { readable } from 'svelte/store';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Returns the current reduced-motion preference. SSR-safe: returns false
 * when window/matchMedia is unavailable (server, older environments).
 */
export function getReducedMotion(): boolean {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return false;
	}
	return window.matchMedia(QUERY).matches;
}

/**
 * Readable store reflecting `(prefers-reduced-motion: reduce)`.
 * Defaults to `false` on the server and updates live in the browser.
 *
 *   import { prefersReducedMotion } from '$lib/utils/reducedMotion';
 *   $: if ($prefersReducedMotion) { ... }   // or `$prefersReducedMotion` in runes mode
 */
export const prefersReducedMotion = readable<boolean>(getReducedMotion(), (set) => {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return;
	}

	const mql = window.matchMedia(QUERY);
	const update = () => set(mql.matches);

	update();
	mql.addEventListener('change', update);

	return () => mql.removeEventListener('change', update);
});
