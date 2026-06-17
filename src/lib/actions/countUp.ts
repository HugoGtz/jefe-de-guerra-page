import type { Action } from 'svelte/action';
import { getReducedMotion } from '$lib/utils/reducedMotion';

export type CountUpParams = {
	/** Valor final al que se anima (desde `from`). */
	to: number;
	/** Valor inicial (por defecto 0). */
	from?: number;
	/** Duración en ms (por defecto 1400). */
	duration?: number;
	/** Decimales a mostrar (por defecto 0). */
	decimals?: number;
	/** Prefijo opcional, p. ej. ''. */
	prefix?: string;
	/** Sufijo opcional, p. ej. '%'. */
	suffix?: string;
	/** Proporción visible para disparar (0–1, por defecto 0.4). */
	threshold?: number;
};

/**
 * Svelte action: anima el textContent de un nodo de `from` → `to` con easing
 * (easeOutExpo) cuando entra en viewport, usando requestAnimationFrame.
 *
 * SSR-safe. Bajo prefers-reduced-motion (o sin IntersectionObserver) escribe
 * directamente el valor final, sin animar.
 *
 *   <span use:countUp={{ to: 100, suffix: '%' }}></span>
 *   <span use:countUp={{ to: 4 }}></span>
 */
export const countUp: Action<HTMLElement, CountUpParams> = (node, params) => {
	let current = params;

	const format = (value: number) => {
		const { prefix = '', suffix = '', decimals = 0 } = current;
		return `${prefix}${value.toFixed(decimals)}${suffix}`;
	};

	const supported =
		typeof window !== 'undefined' && 'IntersectionObserver' in window;

	const setFinal = () => {
		node.textContent = format(current.to);
	};

	if (getReducedMotion() || !supported) {
		setFinal();
		return {
			update(next) {
				current = next;
				setFinal();
			}
		};
	}

	const { from = 0 } = current;
	// Estado inicial visible sin saltar el layout.
	node.textContent = format(from);

	let frame = 0;
	let started = false;
	// easeOutExpo — arranque rápido, frenado elegante.
	const ease = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

	const run = () => {
		const start = current.from ?? 0;
		const end = current.to;
		const duration = current.duration ?? 1400;
		const t0 = performance.now();

		const step = (now: number) => {
			const elapsed = now - t0;
			const progress = Math.min(1, elapsed / duration);
			const value = start + (end - start) * ease(progress);
			node.textContent = format(value);
			if (progress < 1) {
				frame = requestAnimationFrame(step);
			} else {
				setFinal();
			}
		};

		frame = requestAnimationFrame(step);
	};

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting && !started) {
					started = true;
					run();
					observer.unobserve(node);
				}
			}
		},
		{ threshold: current.threshold ?? 0.4 }
	);

	observer.observe(node);

	return {
		update(next) {
			current = next;
		},
		destroy() {
			cancelAnimationFrame(frame);
			observer.disconnect();
		}
	};
};
