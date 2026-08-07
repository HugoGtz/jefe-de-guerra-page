/**
 * SparkBurstScene.ts
 *
 * A short-lived, self-disposing three.js particle burst — reuses the exact
 * same point-sprite + additive-blend technique as `EmberScene.ts` (same
 * texture, same shader shape: `texture2D(...) * alpha` only, no per-pixel
 * procedural math), just with outward initial velocity + gravity + a fixed
 * lifetime instead of the ember field's endless rise/recycle loop.
 *
 * Used for one-off celebration moments (a "hazaña"/first-kill card revealing,
 * a successful guild application) — NOT mounted persistently. Each instance
 * renders its burst once, then calls `onComplete` and disposes itself.
 *
 * Usage:
 *   const burst = new SparkBurstScene(canvasElement, { count: 140 });
 *   burst.play(() => { / * remove the canvas from the DOM * / });
 *   // burst.dispose() is safe to call early too (unmount mid-animation).
 */

import * as THREE from 'three';
import { buildEmberTexture } from './EmberScene';

export type SparkBurstOptions = {
	/** Number of sparks in the burst. Keep modest — this is decorative, not the main scene. */
	count?: number;
	/** Total lifetime in seconds before the burst fully fades and disposes. */
	life?: number;
	/** Max devicePixelRatio used (capped for perf, same rationale as EmberScene). */
	maxDPR?: number;
};

const DEFAULTS: Required<SparkBurstOptions> = { count: 140, life: 1.4, maxDPR: 1.75 };

/** Gravity pulling sparks back down, in clip-units/second². Gentle — this is
 *  a lava-forge spark shower, not a fireworks explosion. */
const GRAVITY = 1.1;

export class SparkBurstScene {
	private canvas: HTMLCanvasElement;
	private opts: Required<SparkBurstOptions>;

	private renderer!: THREE.WebGLRenderer;
	private scene!: THREE.Scene;
	private camera!: THREE.OrthographicCamera;
	private geometry!: THREE.BufferGeometry;
	private material!: THREE.ShaderMaterial;
	private texture!: THREE.CanvasTexture;
	private points!: THREE.Points;

	private positions!: Float32Array;
	private velocities!: Float32Array;
	private sizes!: Float32Array;
	private alphas!: Float32Array;
	private baseAlpha!: Float32Array;

	private positionAttr!: THREE.BufferAttribute;
	private alphaAttr!: THREE.BufferAttribute;

	private rafId: number | null = null;
	private elapsed = 0;
	private disposed = false;

	constructor(canvas: HTMLCanvasElement, options: SparkBurstOptions = {}) {
		this.canvas = canvas;
		this.opts = { ...DEFAULTS, ...options };
		this.init();
	}

	private init(): void {
		const { canvas, opts } = this;
		const width = canvas.clientWidth || canvas.width || 1;
		const height = canvas.clientHeight || canvas.height || 1;

		this.renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: false,
			alpha: true,
			premultipliedAlpha: false,
			powerPreference: 'default'
		});
		const dpr = Math.min(window.devicePixelRatio || 1, opts.maxDPR);
		this.renderer.setPixelRatio(dpr);
		this.renderer.setSize(width, height, false);
		this.renderer.setClearColor(0x000000, 0);

		this.scene = new THREE.Scene();
		this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

		const { count } = opts;
		this.positions = new Float32Array(count * 3);
		this.velocities = new Float32Array(count * 2); // vx, vy per spark
		this.sizes = new Float32Array(count);
		this.alphas = new Float32Array(count);
		this.baseAlpha = new Float32Array(count);

		for (let i = 0; i < count; i++) {
			const i3 = i * 3;
			// All sparks start at the origin (0,0) — burst() offsets via camera-less
			// NDC positioning, so the caller picks WHERE by sizing/positioning the
			// canvas itself (see SparkBurst.svelte), not by an origin parameter here.
			this.positions[i3] = 0;
			this.positions[i3 + 1] = 0;
			this.positions[i3 + 2] = 0;

			// Random outward direction, biased slightly upward (forge-spark feel).
			const angle = Math.random() * Math.PI * 2;
			const speed = 0.35 + Math.random() * 0.85;
			this.velocities[i * 2] = Math.cos(angle) * speed;
			this.velocities[i * 2 + 1] = Math.sin(angle) * speed * 0.7 + 0.25;

			this.sizes[i] = 3 + Math.random() * 7;
			this.baseAlpha[i] = 0.7 + Math.random() * 0.3;
			this.alphas[i] = this.baseAlpha[i];
		}

		this.geometry = new THREE.BufferGeometry();
		this.positionAttr = new THREE.BufferAttribute(this.positions, 3);
		this.positionAttr.setUsage(THREE.DynamicDrawUsage);
		this.geometry.setAttribute('position', this.positionAttr);

		const sizeAttr = new THREE.BufferAttribute(this.sizes, 1);
		this.geometry.setAttribute('aSize', sizeAttr);

		this.alphaAttr = new THREE.BufferAttribute(this.alphas, 1);
		this.alphaAttr.setUsage(THREE.DynamicDrawUsage);
		this.geometry.setAttribute('aAlpha', this.alphaAttr);

		this.texture = buildEmberTexture();

		// Same shader shape as EmberScene: texture2D(...) * alpha only.
		this.material = new THREE.ShaderMaterial({
			uniforms: {
				uTexture: { value: this.texture },
				uDPR: { value: dpr }
			},
			vertexShader: /* glsl */ `
				attribute float aSize;
				attribute float aAlpha;
				varying float vAlpha;
				uniform float uDPR;
				void main() {
					vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
					gl_PointSize = aSize * uDPR;
					gl_Position = projectionMatrix * mvPos;
					vAlpha = aAlpha;
				}
			`,
			fragmentShader: /* glsl */ `
				precision mediump float;
				uniform sampler2D uTexture;
				varying float vAlpha;
				void main() {
					vec4 tex = texture2D(uTexture, gl_PointCoord);
					gl_FragColor = vec4(tex.rgb, tex.a * vAlpha);
				}
			`,
			transparent: true,
			blending: THREE.AdditiveBlending,
			depthTest: false,
			depthWrite: false
		});

		this.points = new THREE.Points(this.geometry, this.material);
		this.scene.add(this.points);
	}

	/** Play the burst once. Calls `onComplete` when the lifetime elapses (or
	 *  immediately if `dispose()` was already called). Safe to call once. */
	play(onComplete: () => void): void {
		if (this.disposed) {
			onComplete();
			return;
		}
		let last = performance.now();
		const tick = (now: number) => {
			if (this.disposed) return;
			const dt = Math.min((now - last) / 1000, 0.05);
			last = now;
			this.elapsed += dt;

			const { life } = this.opts;
			const lifeT = Math.min(this.elapsed / life, 1);
			const fade = 1 - lifeT; // linear fade-out

			for (let i = 0; i < this.opts.count; i++) {
				const i3 = i * 3;
				this.velocities[i * 2 + 1] -= GRAVITY * dt;
				this.positions[i3] += this.velocities[i * 2] * dt;
				this.positions[i3 + 1] += this.velocities[i * 2 + 1] * dt;
				this.alphas[i] = this.baseAlpha[i] * fade;
			}
			this.positionAttr.needsUpdate = true;
			this.alphaAttr.needsUpdate = true;

			this.renderer.render(this.scene, this.camera);

			if (lifeT >= 1) {
				this.dispose();
				onComplete();
				return;
			}
			this.rafId = requestAnimationFrame(tick);
		};
		this.rafId = requestAnimationFrame(tick);
	}

	/** Tear down GPU resources. Safe to call multiple times / mid-animation. */
	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		this.geometry?.dispose();
		this.material?.dispose();
		this.texture?.dispose();
		this.renderer?.dispose();
	}
}
