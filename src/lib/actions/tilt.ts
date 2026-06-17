import type { Action } from 'svelte/action';
import { getReducedMotion } from '$lib/utils/reducedMotion';

export type TiltParams = {
	/** Inclinación máxima en grados. */
	max?: number;
};

/**
 * Svelte action: inclinación sutil con el puntero al hacer hover.
 * SSR-safe y desactivada bajo prefers-reduced-motion.
 *
 *   <div use:tilt={{ max: 6 }}>
 */
export const tilt: Action<HTMLElement, TiltParams | undefined> = (
	node,
	params
) => {
	let max = params?.max ?? 6;

	if (getReducedMotion() || typeof window === 'undefined') {
		return {
			update(next) {
				max = next?.max ?? 6;
			}
		};
	}

	let frame = 0;

	const onMove = (e: PointerEvent) => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			const rect = node.getBoundingClientRect();
			const px = (e.clientX - rect.left) / rect.width - 0.5;
			const py = (e.clientY - rect.top) / rect.height - 0.5;
			const rx = (-py * max).toFixed(2);
			const ry = (px * max).toFixed(2);
			node.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
		});
	};

	const reset = () => {
		cancelAnimationFrame(frame);
		node.style.transform = '';
	};

	node.style.transformStyle = 'preserve-3d';
	node.style.transition = 'transform 0.2s ease';
	node.addEventListener('pointermove', onMove);
	node.addEventListener('pointerleave', reset);

	return {
		update(next) {
			max = next?.max ?? 6;
		},
		destroy() {
			cancelAnimationFrame(frame);
			node.removeEventListener('pointermove', onMove);
			node.removeEventListener('pointerleave', reset);
		}
	};
};
