/**
 * TorchCorridorScene.ts
 *
 * Decorative visualization for raid progress: one torch per Phase 2 boss,
 * alternating along two "walls" receding into depth, lit in order as bosses
 * fall. Reuses `buildEmberTexture()` from EmberScene as an unlit additive
 * flame sprite — no new shader/fragment math, same ANGLE/Metal-safe shape.
 *
 * Deliberately kept small relative to the canvas viewport (unlike the
 * abandoned Hero glow plane, see HeroCrestScene.ts) so nothing extends to the
 * canvas edges — there's no plane geometry here to get hard-clipped.
 *
 * Same lifecycle discipline as the rest of `$lib/three/*`: lazy-imported by
 * the caller, paused via `stop()` when scrolled out of view, never
 * constructed under prefers-reduced-motion, full `dispose()`, WebGL context
 * loss/restore handled.
 */

import * as THREE from 'three';
import { buildEmberTexture } from './EmberScene';

export type TorchCorridorOptions = {
	/** Total number of torches (one per Phase 2 boss). */
	total: number;
	/** Max devicePixelRatio used (capped for perf, same rationale as EmberScene). */
	maxDPR?: number;
};

const WALL_OFFSET = 1.05;
const TORCH_SPACING = 1.3;
/** How quickly a torch's flame eases toward its lit/unlit target scale (per second). */
const FLAME_LERP_RATE = 3;
const LIT_SCALE = 0.36;
const UNLIT_SCALE = 0.1;
const LIT_OPACITY = 1;
const UNLIT_OPACITY = 0.32;

type Torch = {
	flame: THREE.Sprite;
	targetScale: number;
	currentScale: number;
	targetOpacity: number;
	currentOpacity: number;
	flickerPhase: number;
};

export class TorchCorridorScene {
	private canvas: HTMLCanvasElement;
	private opts: Required<TorchCorridorOptions>;

	private renderer!: THREE.WebGLRenderer;
	private scene!: THREE.Scene;
	private camera!: THREE.PerspectiveCamera;
	private flameTexture!: THREE.CanvasTexture;
	private poleMaterial!: THREE.MeshBasicMaterial;
	private torches: Torch[] = [];

	private width = 0;
	private height = 0;
	private resizeObserver: ResizeObserver | null = null;

	private rafId: number | null = null;
	private lastTime = 0;
	private elapsed = 0;
	private active = false;
	private disposed = false;

	private onContextLost: ((e: Event) => void) | null = null;
	private onContextRestored: (() => void) | null = null;
	private contextLost = false;

	constructor(canvas: HTMLCanvasElement, options: TorchCorridorOptions) {
		this.canvas = canvas;
		this.opts = { maxDPR: 1.5, ...options };
		this.init();
	}

	private init(): void {
		const { canvas } = this;
		this.width = canvas.clientWidth || 1;
		this.height = canvas.clientHeight || 1;

		this.renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			alpha: true,
			powerPreference: 'default'
		});
		const dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDPR);
		this.renderer.setPixelRatio(dpr);
		this.renderer.setSize(this.width, this.height, false);
		this.renderer.setClearColor(0x000000, 0);

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(48, this.width / this.height, 0.1, 30);
		const depth = Math.max(this.opts.total - 1, 1) * TORCH_SPACING;
		this.camera.position.set(0, 0.1, 1.5);
		this.camera.lookAt(0, -0.05, -depth * 0.55);

		this.flameTexture = buildEmberTexture();
		this.poleMaterial = new THREE.MeshBasicMaterial({ color: 0x1c1614 });

		for (let i = 0; i < this.opts.total; i++) {
			const side = i % 2 === 0 ? -1 : 1;
			const z = -i * TORCH_SPACING;

			const pole = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.46, 0.045), this.poleMaterial);
			pole.position.set(side * WALL_OFFSET, -0.08, z);
			this.scene.add(pole);

			const flame = new THREE.Sprite(
				new THREE.SpriteMaterial({
					map: this.flameTexture,
					transparent: true,
					depthWrite: false,
					blending: THREE.AdditiveBlending,
					opacity: 0
				})
			);
			flame.position.set(side * WALL_OFFSET, 0.22, z);
			flame.scale.set(0.001, 0.001, 1);
			this.scene.add(flame);

			this.torches.push({
				flame,
				targetScale: 0,
				currentScale: 0,
				targetOpacity: 0,
				currentOpacity: 0,
				flickerPhase: Math.random() * Math.PI * 2
			});
		}

		this.resizeObserver = new ResizeObserver(() => this.onResize());
		this.resizeObserver.observe(canvas.parentElement ?? canvas);

		this.onContextLost = (e: Event) => {
			e.preventDefault();
			this.contextLost = true;
			this.pauseRAF();
		};
		this.onContextRestored = () => {
			this.contextLost = false;
			if (this.active) this.resumeRAF();
		};
		canvas.addEventListener('webglcontextlost', this.onContextLost, false);
		canvas.addEventListener('webglcontextrestored', this.onContextRestored, false);

		this.renderer.render(this.scene, this.camera);
	}

	/** Set how many torches (from the near end) are lit — eases in via the render loop. */
	setLit(litCount: number): void {
		this.torches.forEach((t, i) => {
			const lit = i < litCount;
			t.targetScale = lit ? LIT_SCALE : UNLIT_SCALE;
			t.targetOpacity = lit ? LIT_OPACITY : UNLIT_OPACITY;
		});
	}

	start(): void {
		this.active = true;
		this.resumeRAF();
	}

	stop(): void {
		this.active = false;
		this.pauseRAF();
	}

	dispose(): void {
		this.disposed = true;
		this.stop();
		if (this.onContextLost) {
			this.canvas.removeEventListener('webglcontextlost', this.onContextLost, false);
			this.onContextLost = null;
		}
		if (this.onContextRestored) {
			this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored, false);
			this.onContextRestored = null;
		}
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.torches.forEach((t) => (t.flame.material as THREE.SpriteMaterial).dispose());
		this.torches = [];
		this.flameTexture?.dispose();
		this.poleMaterial?.dispose();
		this.renderer?.dispose();
	}

	private resumeRAF(): void {
		if (this.rafId !== null || this.contextLost || this.disposed) return;
		this.lastTime = performance.now();
		this.rafId = requestAnimationFrame((t) => this.loop(t));
	}

	private pauseRAF(): void {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
	}

	private loop(timestamp: number): void {
		const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
		this.lastTime = timestamp;
		this.elapsed += dt;

		const rate = Math.min(FLAME_LERP_RATE * dt, 1);
		for (const t of this.torches) {
			t.currentScale += (t.targetScale - t.currentScale) * rate;
			t.currentOpacity += (t.targetOpacity - t.currentOpacity) * rate;

			// Only flicker once a torch is meaningfully lit — unlit embers stay still.
			const flicker =
				t.currentOpacity > 0.5 ? 1 + Math.sin(this.elapsed * 6 + t.flickerPhase) * 0.08 : 1;
			const scale = Math.max(t.currentScale * flicker, 0.001);
			t.flame.scale.set(scale, scale, 1);
			(t.flame.material as THREE.SpriteMaterial).opacity = t.currentOpacity;
		}

		this.renderer.render(this.scene, this.camera);
		this.rafId = requestAnimationFrame((t) => this.loop(t));
	}

	private onResize(): void {
		const el = this.canvas.parentElement ?? this.canvas;
		const w = el.clientWidth || 1;
		const h = el.clientHeight || 1;
		if (w === this.width && h === this.height) return;
		this.width = w;
		this.height = h;
		const dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDPR);
		this.renderer.setPixelRatio(dpr);
		this.renderer.setSize(w, h, false);
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
	}
}
