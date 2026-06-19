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
	// Append our transform transition to whatever the component already declares
	// (e.g. box-shadow / border hover transitions on cards) instead of clobbering
	// it. Drop any pre-existing `transform` transition the stylesheet set so ours
	// is the single source of truth for transform timing.
	const existing = getComputedStyle(node).transition;
	const tiltTransition = 'transform 0.2s ease';
	const preserved = existing
		.split(',')
		.map((part) => part.trim())
		.filter((part) => part && part !== 'all 0s ease 0s' && !/^transform\b/.test(part));
	node.style.transition = [...preserved, tiltTransition].join(', ');
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
