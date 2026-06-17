import type { Action } from 'svelte/action';
import { getReducedMotion } from '$lib/utils/reducedMotion';

/** Dirección desde la que entra el elemento al revelarse. */
export type RevealDirection = 'up' | 'left' | 'right';

export type RevealParams = {
	/** Retardo en ms antes de revelar (para escalonar elementos). */
	delay?: number;
	/** Proporción visible para disparar (0–1). */
	threshold?: number;
	/** Revelar una sola vez (por defecto true). */
	once?: boolean;
	/** Dirección de entrada del slide (por defecto 'up'). */
	direction?: RevealDirection;
	/** Añadir un desenfoque sutil que se aclara al revelar. */
	blur?: boolean;
	/** Callback opcional al revelar — útil para disparar animaciones (p. ej. barras). */
	onreveal?: () => void;
};

/**
 * Svelte action: fade + slide-in (con dirección y blur opcionales) cuando el
 * elemento entra en viewport. SSR-safe. Bajo prefers-reduced-motion el
 * elemento aparece de inmediato sin transform/filter.
 *
 *   <div use:reveal>                                <!-- por defecto (up) -->
 *   <div use:reveal={{ delay: 120 }}>
 *   <div use:reveal={{ direction: 'left', blur: true }}>
 */
export const reveal: Action<HTMLElement, RevealParams | undefined> = (
	node,
	params
) => {
	let {
		delay = 0,
		threshold = 0.15,
		once = true,
		direction = 'up',
		blur = false,
		onreveal
	}: RevealParams = params ?? {};

	const reduced = getReducedMotion();

	// Estado base (oculto) solo cuando hay movimiento permitido y soporte IO.
	const supported =
		typeof window !== 'undefined' && 'IntersectionObserver' in window;

	const applyVariant = () => {
		// Clases de dirección/blur — el CSS global (en +layout.svelte) las usa.
		node.classList.toggle('reveal--left', direction === 'left');
		node.classList.toggle('reveal--right', direction === 'right');
		node.classList.toggle('reveal--blur', blur);
	};

	const show = () => {
		node.classList.add('is-revealed');
		node.classList.remove('is-hidden');
		onreveal?.();
	};

	if (reduced || !supported) {
		// Mostrar inmediatamente, sin transform/filter.
		show();
		return {
			update(next) {
				onreveal = next?.onreveal;
			}
		};
	}

	node.classList.add('reveal', 'is-hidden');
	applyVariant();
	if (delay) node.style.setProperty('--reveal-delay', `${delay}ms`);

	let timer: ReturnType<typeof setTimeout> | undefined;

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					timer = setTimeout(show, delay);
					if (once) observer.unobserve(node);
				} else if (!once) {
					node.classList.remove('is-revealed');
					node.classList.add('is-hidden');
				}
			}
		},
		{ threshold }
	);

	observer.observe(node);

	return {
		update(next) {
			delay = next?.delay ?? 0;
			threshold = next?.threshold ?? 0.15;
			once = next?.once ?? true;
			direction = next?.direction ?? 'up';
			blur = next?.blur ?? false;
			onreveal = next?.onreveal;
			applyVariant();
			if (delay) node.style.setProperty('--reveal-delay', `${delay}ms`);
		},
		destroy() {
			if (timer) clearTimeout(timer);
			observer.disconnect();
		}
	};
};
