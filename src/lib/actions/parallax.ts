import type { Action } from 'svelte/action';
import { getReducedMotion } from '$lib/utils/reducedMotion';

export type ParallaxParams = {
	/**
	 * Factor de velocidad. <1 mueve más lento que el scroll (fondo),
	 * 0 = estático, valores negativos mueven en sentido contrario.
	 */
	speed?: number;
};

/**
 * Svelte action: traslada el elemento en el eje Y según el scroll usando
 * requestAnimationFrame + translate3d (GPU-friendly).
 * SSR-safe y desactivada bajo prefers-reduced-motion.
 *
 *   <div use:parallax={{ speed: 0.3 }}>
 */
export const parallax: Action<HTMLElement, ParallaxParams | undefined> = (
	node,
	params
) => {
	let speed = params?.speed ?? 0.3;

	if (getReducedMotion() || typeof window === 'undefined') {
		return {
			update(next) {
				speed = next?.speed ?? 0.3;
			}
		};
	}

	let ticking = false;
	let frame = 0;

	const apply = () => {
		ticking = false;
		const rect = node.getBoundingClientRect();
		// Desplazamiento relativo al centro del viewport para un efecto suave.
		const viewportCenter = window.innerHeight / 2;
		const elementCenter = rect.top + rect.height / 2;
		const distance = elementCenter - viewportCenter;
		const offset = -distance * speed;
		node.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
	};

	const onScroll = () => {
		if (!ticking) {
			ticking = true;
			frame = requestAnimationFrame(apply);
		}
	};

	node.style.willChange = 'transform';
	apply();

	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', onScroll, { passive: true });

	return {
		update(next) {
			speed = next?.speed ?? 0.3;
			onScroll();
		},
		destroy() {
			cancelAnimationFrame(frame);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
			// Release the compositor-layer hint we added on setup.
			node.style.willChange = '';
		}
	};
};
