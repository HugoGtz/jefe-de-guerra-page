import type { Action } from 'svelte/action';

export type ScrollSpyParams = {
	/** IDs de las secciones a observar, en orden de aparición. */
	ids: string[];
	/** Callback con el id de la sección actualmente activa (o null). */
	onactive: (id: string | null) => void;
};

/**
 * Svelte action (montada en un elemento cualquiera, p. ej. el <header>): observa
 * las secciones cuyos `ids` se pasan y reporta cuál está actualmente en vista
 * mediante `onactive`. Usa IntersectionObserver con un rootMargin que prioriza
 * el tercio superior del viewport para un resaltado de navegación natural.
 *
 * No anima nada por sí misma (el resaltado visual lo aplica la UI con CSS), por
 * lo que es segura bajo prefers-reduced-motion. SSR-safe.
 *
 *   <header use:scrollSpy={{ ids, onactive: (id) => (active = id) }}>
 */
export const scrollSpy: Action<HTMLElement, ScrollSpyParams> = (node, params) => {
	let current = params;

	const supported =
		typeof window !== 'undefined' && 'IntersectionObserver' in window;

	if (!supported) {
		return {
			update(next) {
				current = next;
			}
		};
	}

	// Visibilidad por sección; elegimos la más visible / superior como activa.
	const ratios = new Map<string, number>();

	const recompute = () => {
		let bestId: string | null = null;
		let bestRatio = 0;
		for (const id of current.ids) {
			const r = ratios.get(id) ?? 0;
			if (r > bestRatio) {
				bestRatio = r;
				bestId = id;
			}
		}
		current.onactive(bestId);
	};

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const id = entry.target.id;
				ratios.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
			}
			recompute();
		},
		{
			// Recorta el viewport hacia su banda central, dejando una franja de
			// activación amplia (~30%) para que las secciones altas no parpadeen
			// a "ninguna activa" al desplazarse dentro de ellas.
			rootMargin: '-35% 0px -35% 0px',
			threshold: [0, 0.01, 0.25, 0.5, 0.75, 1]
		}
	);

	const observeAll = () => {
		ratios.clear();
		observer.disconnect();
		for (const id of current.ids) {
			const el = document.getElementById(id);
			if (el) observer.observe(el);
		}
	};

	observeAll();

	return {
		update(next) {
			current = next;
			observeAll();
		},
		destroy() {
			observer.disconnect();
		}
	};
};
