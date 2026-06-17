import type { Action } from 'svelte/action';
import { getReducedMotion } from '$lib/utils/reducedMotion';

export type CursorTiltParams = {
	/** Inclinación máxima en grados (por defecto 8). */
	max?: number;
	/** Elemento de referencia para el cálculo (por defecto el propio nodo). */
	zone?: HTMLElement | null;
};

/**
 * Svelte action: inclina el nodo en 3D hacia el puntero según su posición
 * dentro de una "zona" (por defecto el héroe que lo contiene). Pensado para
 * el logo del héroe: la inclinación va en un wrapper EXTERNO para que componga
 * limpiamente con la flotación idle y la entrada "forja" en wrappers internos.
 *
 * rAF-throttled, listeners pasivos, vuelve a neutral al salir. SSR-safe.
 * Desactivada bajo prefers-reduced-motion y en punteros gruesos (táctil).
 *
 *   <div use:cursorTilt={{ max: 8, zone: heroEl }}>
 */
export const cursorTilt: Action<HTMLElement, CursorTiltParams | undefined> = (
	node,
	params
) => {
	let max = params?.max ?? 8;
	let zone: HTMLElement = params?.zone ?? node;

	const reduced = getReducedMotion();
	const finePointer =
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(hover: hover) and (pointer: fine)').matches;

	if (reduced || !finePointer || typeof window === 'undefined') {
		return {
			update(next) {
				max = next?.max ?? 8;
				zone = next?.zone ?? node;
			}
		};
	}

	node.style.transformStyle = 'preserve-3d';
	node.style.transition = 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)';
	node.style.willChange = 'transform';

	let frame = 0;
	let pendingX = 0;
	let pendingY = 0;

	const apply = () => {
		frame = 0;
		const rect = zone.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;
		const px = (pendingX - rect.left) / rect.width - 0.5;
		const py = (pendingY - rect.top) / rect.height - 0.5;
		const rx = (-py * max).toFixed(2);
		const ry = (px * max).toFixed(2);
		node.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
	};

	const onMove = (e: PointerEvent) => {
		if (e.pointerType !== 'mouse') return;
		pendingX = e.clientX;
		pendingY = e.clientY;
		if (frame === 0) frame = requestAnimationFrame(apply);
	};

	const reset = () => {
		if (frame !== 0) {
			cancelAnimationFrame(frame);
			frame = 0;
		}
		node.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
	};

	zone.addEventListener('pointermove', onMove, { passive: true });
	zone.addEventListener('pointerleave', reset, { passive: true });

	return {
		update(next) {
			max = next?.max ?? 8;
			const nextZone = next?.zone ?? node;
			if (nextZone !== zone) {
				zone.removeEventListener('pointermove', onMove);
				zone.removeEventListener('pointerleave', reset);
				zone = nextZone;
				zone.addEventListener('pointermove', onMove, { passive: true });
				zone.addEventListener('pointerleave', reset, { passive: true });
			}
		},
		destroy() {
			if (frame !== 0) cancelAnimationFrame(frame);
			zone.removeEventListener('pointermove', onMove);
			zone.removeEventListener('pointerleave', reset);
		}
	};
};
