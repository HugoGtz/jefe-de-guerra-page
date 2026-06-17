/**
 * EmberScene.ts
 *
 * Self-contained three.js WebGL ember-particle layer for "Jefe de Guerra".
 * Renders floating, additive-blended glowing ember sprites over a TRANSPARENT
 * canvas. The dark "forge / lava glow" atmosphere itself is provided by cheap,
 * rock-solid CSS gradients behind the canvas (see WebGLBackground.svelte).
 *
 * Why no procedural background shader?
 *   A full-screen-quad fragment shader doing per-pixel procedural math
 *   (noise / cracks / vignette / SDF / raymarch) miscompiles on some GPU paths
 *   (observed on ANGLE/Metal): isolated screen tiles return garbage, showing up
 *   as hard rectangular blocks. Interpolated varyings and point sprites render
 *   fine, so the atmosphere was moved to CSS and WebGL is kept to the embers only.
 *
 *   The ONLY fragment math here is: texture2D(uTexture, gl_PointCoord) * alpha.
 *   No gl_FragCoord-driven procedural color fields of any kind.
 *
 * Usage:
 *   const scene = new EmberScene(canvasElement);
 *   scene.start();   // begin / resume RAF loop
 *   scene.stop();    // pause RAF loop
 *   scene.dispose(); // full teardown
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Tunables — adjust to taste without touching logic
// ---------------------------------------------------------------------------

/**
 * Particle counts per depth layer.
 * Layer 0 = FAR  (small, dim, slow)
 * Layer 1 = MID  (medium, moderate brightness, moderate speed)
 * Layer 2 = NEAR (larger, bright, fast — the "sparks" layer includes these)
 * Keep total under ~700 for mobile comfort; 60fps target.
 */
const LAYER_COUNTS = [180, 140, 90] as const; // far, mid, near

/** Total ember count derived from layers (no manual sync needed). */
const EMBER_COUNT = LAYER_COUNTS[0] + LAYER_COUNTS[1] + LAYER_COUNTS[2]; // 410

/**
 * Base rise speed (clip units / second) per layer.
 * Far = slowest, Near = fastest for parallax feel.
 */
const LAYER_RISE_SPEED = [0.035, 0.065, 0.11] as const;

/**
 * Speed multiplier random range [min, max] per ember within a layer.
 * Wider range in near layer creates intermittent bright "sparks".
 */
const LAYER_SPEED_RANGE: [number, number][] = [
	[0.5, 1.2], // far
	[0.6, 1.4], // mid
	[0.7, 2.0] //  near: upper end produces fast "spark" embers
];

/** Point size range [min, max] in CSS pixels per layer. */
const LAYER_SIZE_RANGE: [number, number][] = [
	[1.5, 3.5], // far: tiny wisps
	[2.5, 6.0], // mid
	[4.0, 11.0] // near: can be large bright sparks
];

/** Base opacity per layer (before per-particle twinkle). */
const LAYER_BASE_ALPHA = [0.45, 0.72, 1.0] as const;

/** Horizontal sway amplitude (clip units) per layer. Far sways less. */
const LAYER_SWAY_AMPLITUDE = [0.02, 0.038, 0.055] as const;

/** Horizontal sway frequency (Hz). Each ember gets its own phase offset. */
const EMBER_SWAY_FREQUENCY = 0.38;

/**
 * Twinkle (alpha oscillation) amplitude per layer.
 * Far embers twinkle gently; near embers flicker more dramatically.
 */
const LAYER_TWINKLE_AMPLITUDE = [0.25, 0.38, 0.52] as const;

/** Twinkle frequency range [min, max] Hz. Each ember picks its own. */
const TWINKLE_FREQ_MIN = 0.4;
const TWINKLE_FREQ_MAX = 2.2;

/**
 * "Bright spark" threshold: embers in the NEAR layer whose speed multiplier
 * exceeds this fraction of the speed range are treated as sparks — they also
 * get a boosted size. This creates intermittent fast bright specks.
 */
const SPARK_SPEED_THRESHOLD = 1.55;

/** Maximum devicePixelRatio used (capped for perf). */
const MAX_DPR = 1.75;

// ---------------------------------------------------------------------------
// Ember sprite: tiny glowing disc drawn onto a Canvas2D, converted to texture
// ---------------------------------------------------------------------------

function buildEmberTexture(): THREE.CanvasTexture {
	const size = 64;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d')!;
	const r = size / 2;

	const grd = ctx.createRadialGradient(r, r, 0, r, r, r);
	grd.addColorStop(0.0, 'rgba(255, 210, 160, 1.0)'); // hot white-orange core
	grd.addColorStop(0.15, 'rgba(255, 180, 120, 1.0)'); // warm core
	grd.addColorStop(0.3, 'rgba(255, 107, 44, 0.9)'); //  #ff6b2c
	grd.addColorStop(0.5, 'rgba(255, 59, 33, 0.6)'); //   #ff3b21
	grd.addColorStop(0.72, 'rgba(161, 6, 19, 0.25)'); //  #a10613 halo
	grd.addColorStop(1.0, 'rgba(10, 7, 8, 0.0)'); //      transparent edge

	ctx.fillStyle = grd;
	ctx.fillRect(0, 0, size, size);

	const tex = new THREE.CanvasTexture(canvas);
	// No mipmaps: keeps the disc clean at small sizes and avoids corner bleed.
	tex.generateMipmaps = false;
	tex.minFilter = THREE.LinearFilter;
	tex.magFilter = THREE.LinearFilter;
	return tex;
}

// ---------------------------------------------------------------------------
// Per-ember state (kept in typed arrays — no per-frame allocation)
// ---------------------------------------------------------------------------

interface EmberState {
	positions: Float32Array; // x, y, z × EMBER_COUNT
	phases: Float32Array; //     horizontal sway phase per ember
	speeds: Float32Array; //     rise speed multiplier per ember
	sizes: Float32Array; //      sprite size per ember
	alphas: Float32Array; //     current alpha per ember (written each frame)
	baseAlpha: Float32Array; //  layer base alpha per ember
	twinkleAmp: Float32Array; // twinkle amplitude per ember
	twinkleFreq: Float32Array; // twinkle frequency (Hz) per ember
	twinklePhase: Float32Array; // per-ember twinkle phase offset
	layer: Uint8Array; //        0 / 1 / 2 — which depth layer
}

function randomRange(min: number, max: number): number {
	return min + Math.random() * (max - min);
}

function initEmberAt(index: number, state: EmberState, yOverride?: number): void {
	const i3 = index * 3;
	const layer = state.layer[index];

	state.positions[i3 + 0] = randomRange(-1.0, 1.0); // x: full width
	state.positions[i3 + 1] = yOverride ?? randomRange(-1.25, 1.0); // y
	state.positions[i3 + 2] = 0.0;

	state.phases[index] = Math.random() * Math.PI * 2;

	const [sMin, sMax] = LAYER_SPEED_RANGE[layer];
	const speed = randomRange(sMin, sMax);
	state.speeds[index] = speed;

	// Near-layer sparks: if speed exceeds threshold, boost size noticeably.
	const [szMin, szMax] = LAYER_SIZE_RANGE[layer];
	let size = randomRange(szMin, szMax);
	if (layer === 2 && speed >= SPARK_SPEED_THRESHOLD) {
		size = randomRange(szMax * 0.85, szMax * 1.25);
	}
	state.sizes[index] = size;

	state.baseAlpha[index] = LAYER_BASE_ALPHA[layer];
	state.twinkleAmp[index] = LAYER_TWINKLE_AMPLITUDE[layer] * randomRange(0.5, 1.0);
	state.twinkleFreq[index] = randomRange(TWINKLE_FREQ_MIN, TWINKLE_FREQ_MAX);
	state.twinklePhase[index] = Math.random() * Math.PI * 2;
	state.alphas[index] = state.baseAlpha[index];
}

function buildEmberState(): EmberState {
	const state: EmberState = {
		positions: new Float32Array(EMBER_COUNT * 3),
		phases: new Float32Array(EMBER_COUNT),
		speeds: new Float32Array(EMBER_COUNT),
		sizes: new Float32Array(EMBER_COUNT),
		alphas: new Float32Array(EMBER_COUNT),
		baseAlpha: new Float32Array(EMBER_COUNT),
		twinkleAmp: new Float32Array(EMBER_COUNT),
		twinkleFreq: new Float32Array(EMBER_COUNT),
		twinklePhase: new Float32Array(EMBER_COUNT),
		layer: new Uint8Array(EMBER_COUNT)
	};

	// Assign layers in contiguous blocks for simple index math.
	// Layer 0: indices 0 .. LAYER_COUNTS[0]-1
	// Layer 1: indices LAYER_COUNTS[0] .. LAYER_COUNTS[0]+LAYER_COUNTS[1]-1
	// Layer 2: remaining
	let offset = 0;
	for (let l = 0; l < 3; l++) {
		for (let k = 0; k < LAYER_COUNTS[l]; k++) {
			state.layer[offset + k] = l as 0 | 1 | 2;
		}
		offset += LAYER_COUNTS[l];
	}

	for (let i = 0; i < EMBER_COUNT; i++) {
		initEmberAt(i, state);
	}
	return state;
}

// ---------------------------------------------------------------------------
// EmberScene class
// ---------------------------------------------------------------------------

export class EmberScene {
	private canvas: HTMLCanvasElement;
	private renderer!: THREE.WebGLRenderer;

	private scene!: THREE.Scene;
	private camera!: THREE.OrthographicCamera;
	private geometry!: THREE.BufferGeometry;
	private positionAttr!: THREE.BufferAttribute;
	private sizeAttr!: THREE.BufferAttribute;
	private alphaAttr!: THREE.BufferAttribute;
	private material!: THREE.ShaderMaterial;
	private texture!: THREE.CanvasTexture;
	private state!: EmberState;
	private points!: THREE.Points;

	// RAF / timing
	private rafId: number | null = null;
	private lastTime = 0;
	private totalTime = 0;
	private running = false;

	// Resize
	private resizeObserver: ResizeObserver | null = null;
	private width = 0;
	private height = 0;

	// Visibility
	private onVisibilityChange: (() => void) | null = null;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.init();
	}

	// -----------------------------------------------------------------------
	// Initialisation
	// -----------------------------------------------------------------------

	private init(): void {
		const { canvas } = this;
		this.width = canvas.clientWidth || window.innerWidth;
		this.height = canvas.clientHeight || window.innerHeight;

		// Transparent renderer — the CSS layer behind provides the atmosphere.
		this.renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: false,
			alpha: true,
			premultipliedAlpha: false,
			powerPreference: 'default'
		});
		const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
		this.renderer.setPixelRatio(dpr);
		this.renderer.setSize(this.width, this.height, false);
		this.renderer.setClearColor(0x000000, 0); // fully transparent clear

		this.buildEmbers();

		// Resize handling
		this.resizeObserver = new ResizeObserver(() => this.onResize());
		this.resizeObserver.observe(canvas.parentElement ?? canvas);

		// Visibility — pause when tab hidden
		this.onVisibilityChange = () => {
			if (document.hidden) {
				this.pauseRAF();
			} else if (this.running) {
				this.resumeRAF();
			}
		};
		document.addEventListener('visibilitychange', this.onVisibilityChange);
	}

	private buildEmbers(): void {
		this.scene = new THREE.Scene();
		// z range includes 0 so points at z=0 are never clipped.
		this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

		this.state = buildEmberState();

		this.geometry = new THREE.BufferGeometry();

		this.positionAttr = new THREE.BufferAttribute(this.state.positions, 3);
		this.positionAttr.setUsage(THREE.DynamicDrawUsage);
		this.geometry.setAttribute('position', this.positionAttr);

		this.sizeAttr = new THREE.BufferAttribute(this.state.sizes, 1);
		this.sizeAttr.setUsage(THREE.DynamicDrawUsage);
		this.geometry.setAttribute('aSize', this.sizeAttr);

		this.alphaAttr = new THREE.BufferAttribute(this.state.alphas, 1);
		this.alphaAttr.setUsage(THREE.DynamicDrawUsage);
		this.geometry.setAttribute('aAlpha', this.alphaAttr);

		this.texture = buildEmberTexture();

		// -----------------------------------------------------------------------
		// Shaders — point-sprite only. NO gl_FragCoord procedural color field.
		// Fragment math: texture2D(uTexture, gl_PointCoord) * alpha varyings only.
		// -----------------------------------------------------------------------
		this.material = new THREE.ShaderMaterial({
			uniforms: {
				uTexture: { value: this.texture },
				uDPR: { value: Math.min(window.devicePixelRatio || 1, MAX_DPR) }
			},
			vertexShader: /* glsl */ `
				attribute float aSize;
				attribute float aAlpha;
				varying float vAlpha;
				uniform float uDPR;
				void main() {
					vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
					gl_PointSize = aSize * uDPR;
					gl_Position  = projectionMatrix * mvPos;
					// Combine per-particle twinkle alpha with top-edge fade.
					float edgeFade = 1.0 - smoothstep(0.65, 1.08, position.y);
					vAlpha = aAlpha * edgeFade;
				}
			`,
			fragmentShader: /* glsl */ `
				precision mediump float;
				uniform sampler2D uTexture;
				varying float vAlpha;
				void main() {
					// Point-sprite texture lookup only. No procedural per-pixel math.
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

	// -----------------------------------------------------------------------
	// Public API
	// -----------------------------------------------------------------------

	/** Start (or resume) the animation loop. Safe to call multiple times. */
	start(): void {
		this.running = true;
		if (!document.hidden) {
			this.resumeRAF();
		}
	}

	/** Pause the animation loop without disposing resources. */
	stop(): void {
		this.running = false;
		this.pauseRAF();
	}

	/** Fully destroy all three.js resources and event listeners. */
	dispose(): void {
		this.stop();

		if (this.onVisibilityChange) {
			document.removeEventListener('visibilitychange', this.onVisibilityChange);
			this.onVisibilityChange = null;
		}

		this.resizeObserver?.disconnect();
		this.resizeObserver = null;

		this.geometry.dispose();
		this.material.dispose();
		this.texture.dispose();
		this.renderer.dispose();
	}

	// -----------------------------------------------------------------------
	// Internal: RAF management
	// -----------------------------------------------------------------------

	private resumeRAF(): void {
		if (this.rafId !== null) return;
		this.lastTime = performance.now();
		this.rafId = requestAnimationFrame((t) => this.loop(t));
	}

	private pauseRAF(): void {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
	}

	// -----------------------------------------------------------------------
	// Main loop
	// -----------------------------------------------------------------------

	private loop(timestamp: number): void {
		const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05); // cap at 50ms
		this.lastTime = timestamp;
		this.totalTime += dt;

		this.updateEmbers(dt);
		this.renderer.render(this.scene, this.camera);

		this.rafId = requestAnimationFrame((t) => this.loop(t));
	}

	private updateEmbers(dt: number): void {
		const {
			positions,
			phases,
			speeds,
			alphas,
			baseAlpha,
			twinkleAmp,
			twinkleFreq,
			twinklePhase,
			layer
		} = this.state;
		const t = this.totalTime;

		for (let i = 0; i < EMBER_COUNT; i++) {
			const i3 = i * 3;
			const l = layer[i];

			// Rise at layer-specific base speed × per-particle multiplier
			positions[i3 + 1] += LAYER_RISE_SPEED[l] * speeds[i] * dt;

			// Horizontal sway — each ember has unique phase
			const swayFreq = EMBER_SWAY_FREQUENCY * Math.PI * 2;
			const sway = Math.sin(t * swayFreq + phases[i]) * LAYER_SWAY_AMPLITUDE[l];
			positions[i3 + 0] += sway * dt;

			// Twinkle: sine-based alpha oscillation at per-particle frequency
			const twinkle =
				Math.sin(t * twinkleFreq[i] * Math.PI * 2 + twinklePhase[i]) * twinkleAmp[i];
			alphas[i] = Math.max(0.02, baseAlpha[i] + twinkle);

			// Recycle embers that have drifted off the top
			if (positions[i3 + 1] > 1.15) {
				initEmberAt(i, this.state, -1.15);
			}
		}

		this.positionAttr.needsUpdate = true;
		this.alphaAttr.needsUpdate = true;
		// Sizes only change on recycle, but marking needsUpdate is cheap
		this.sizeAttr.needsUpdate = true;
	}

	// -----------------------------------------------------------------------
	// Resize
	// -----------------------------------------------------------------------

	private onResize(): void {
		const el = this.canvas.parentElement ?? this.canvas;
		const w = el.clientWidth || window.innerWidth;
		const h = el.clientHeight || window.innerHeight;

		if (w === this.width && h === this.height) return;
		this.width = w;
		this.height = h;

		const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
		this.renderer.setPixelRatio(dpr);
		this.renderer.setSize(w, h, false);
		this.material.uniforms.uDPR.value = dpr;
	}
}
