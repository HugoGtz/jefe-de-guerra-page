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
 *   (observed on ANGLE/Metal): isolated screen tiles return garbage, showing
 *   as hard rectangular blocks. Interpolated varyings and point sprites render
 *   fine, so the atmosphere was moved to CSS and WebGL is kept to the embers only.
 *
 *   The ONLY fragment math here is: texture2D(uTexture, gl_PointCoord) * alpha.
 *   No gl_FragCoord-driven procedural color fields of any kind.
 *
 * Everything added on top of the base ember field (cursor proximity, section
 * mood, forge-flare flashes, scroll parallax, the smoke layer) is deliberately
 * kept CPU-side, modulating the same per-particle typed arrays already
 * recomputed and re-uploaded every frame. None of it touches the vertex/
 * fragment shader source above, so none of it can reintroduce the ANGLE/Metal
 * risk this file already worked around once.
 *
 * The one exception is the whole-page camera drift (see updateCameraDrift):
 * a plain camera rotation/zoom driven by total scroll progress, not a
 * per-particle modulation. Still shader-free — it only changes the camera's
 * matrices, the same standard three.js operation any scene does on resize.
 *
 * Usage:
 *   const scene = new EmberScene(canvasElement);
 *   scene.start();   // begin / resume RAF loop
 *   scene.stop();    // pause RAF loop
 *   scene.setMood({ alpha: 1.2, speed: 1.15 }); // lerped, see setMood()
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
// Cursor-proximity brightening (idea: "ganancias rápidas" #1)
// CPU-side only — no shader changes. Nearby embers get a soft alpha boost
// that fades out with distance, mirroring what CursorGlow already does in
// CSS but reacting on the ember field itself.
// ---------------------------------------------------------------------------

/** Radius of influence in clip-space units (-1..1 covers the whole canvas). */
const CURSOR_INFLUENCE_RADIUS = 0.45;
/** Max extra alpha added to an ember exactly at the cursor position. */
const CURSOR_ALPHA_BOOST = 0.4;
/** Cursor position lerp rate (per second) — smooths out jitter. */
const CURSOR_LERP_RATE = 10;

// ---------------------------------------------------------------------------
// Section-aware mood (idea: "ganancias rápidas" #2 + #3, merged) — driven by
// WebGLBackground via setMood(). Lerped so section changes never snap.
// ---------------------------------------------------------------------------

/** How fast the current mood multipliers approach their target (per second). */
const MOOD_LERP_RATE = 0.8;

// ---------------------------------------------------------------------------
// Forge-flare flash (idea: "ganancias rápidas" #3 atmospheric) — a rare,
// brief brightness pulse on the near layer, like distant heat-lightning
// reflecting off the embers. Purely a CPU-side alpha modulation.
// ---------------------------------------------------------------------------

const FLARE_MIN_INTERVAL_S = 10;
const FLARE_MAX_INTERVAL_S = 20;
const FLARE_DURATION_S = 0.45;
const FLARE_ALPHA_BOOST = 0.55;

// ---------------------------------------------------------------------------
// Scroll-coupled depth parallax — far/mid/near layers read the SAME scroll
// signal at different fractions for a depth cue. Applied only to a separate
// "display" copy of the positions (see EmberState.displayPositions) so it
// never accumulates into the intrinsic simulation state.
// ---------------------------------------------------------------------------

const PARALLAX_FRACTION = [0.05, 0.12, 0.22] as const; // far, mid, near
/** Clip-unit distance the parallax offset saturates at (prevents runaway on long pages). */
const PARALLAX_MAX_OFFSET = 0.18;

// ---------------------------------------------------------------------------
// Whole-page camera drift — a second, independent scroll signal (0 at the top
// of the page, 1 at the bottom, not per-layer like the parallax above) that
// rolls, pans and zooms the ORTHOGRAPHIC camera itself. Pure camera-matrix
// changes: no new shader code, so none of the ANGLE/Metal fragment risk this
// file already worked around applies here — a projection/position/rotation
// update is standard three.js, unrelated to per-pixel procedural color math.
// ---------------------------------------------------------------------------

/** Max camera roll (radians) reached at the very bottom of the page. */
const CAMERA_ROTATION_MAX = (14 * Math.PI) / 180; // ~14°
/** Zoom "breathes" by this fraction, peaking at the page's midpoint. */
const CAMERA_ZOOM_AMPLITUDE = 0.22;
/** Horizontal camera pan (clip units), swinging one way then back over the page. */
const CAMERA_PAN_AMPLITUDE = 0.4;
/** How fast the camera eases toward its scroll-derived target (per second). */
const CAMERA_LERP_RATE = 1.1;

// ---------------------------------------------------------------------------
// Smoke/ash layer — sparser, softer, normal-blended, drifts behind the
// embers. Same CanvasTexture-sprite technique as the embers (proven safe),
// just a different gradient, blend mode and motion profile.
// ---------------------------------------------------------------------------

const SMOKE_COUNT = 26;
const SMOKE_RISE_SPEED = 0.018;
const SMOKE_SWAY_AMPLITUDE = 0.05;
const SMOKE_SWAY_FREQUENCY = 0.12;
const SMOKE_SIZE_RANGE: [number, number] = [60, 130];
const SMOKE_ALPHA_RANGE: [number, number] = [0.05, 0.12];

// ---------------------------------------------------------------------------
// Ember sprite: tiny glowing disc drawn onto a Canvas2D, converted to texture
// ---------------------------------------------------------------------------

/** Exported so SparkBurstScene can reuse the exact same glow look for the
 *  celebration bursts (Apply success, Hall of Fame new-entry). */
export function buildEmberTexture(): THREE.CanvasTexture {
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

/** Soft grey-ash blob for the smoke layer — same technique, cooler/greyer tone. */
function buildSmokeTexture(): THREE.CanvasTexture {
	const size = 64;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d')!;
	const r = size / 2;

	const grd = ctx.createRadialGradient(r, r, 0, r, r, r);
	grd.addColorStop(0.0, 'rgba(90, 78, 74, 0.55)');
	grd.addColorStop(0.4, 'rgba(60, 50, 48, 0.32)');
	grd.addColorStop(0.75, 'rgba(30, 24, 22, 0.12)');
	grd.addColorStop(1.0, 'rgba(10, 7, 8, 0.0)');

	ctx.fillStyle = grd;
	ctx.fillRect(0, 0, size, size);

	const tex = new THREE.CanvasTexture(canvas);
	tex.generateMipmaps = false;
	tex.minFilter = THREE.LinearFilter;
	tex.magFilter = THREE.LinearFilter;
	return tex;
}

// ---------------------------------------------------------------------------
// Per-ember state (kept in typed arrays — no per-frame allocation)
// ---------------------------------------------------------------------------

interface EmberState {
	positions: Float32Array; //  x, y, z × EMBER_COUNT — intrinsic sim position
	displayPositions: Float32Array; // uploaded to the GPU: positions + parallax
	phases: Float32Array; //     horizontal sway phase per ember
	speeds: Float32Array; //     rise speed multiplier per ember
	sizes: Float32Array; //      sprite size per ember
	alphas: Float32Array; //     current alpha per ember (written each frame)
	baseAlpha: Float32Array; //  layer base alpha per ember
	twinkleAmp: Float32Array; // twinkle amplitude per ember
	twinkleFreq: Float32Array; // twinkle frequency (Hz) per ember
	twinklePhase: Float32Array; // per-ember twinkle phase offset
	layer: Uint8Array; //        0 / 1 / 2 — which depth layer
	sizeDirty: boolean; //       set when any ember size changes (init/recycle)
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
	// Size changed (initial seed or recycle) — flag a single GPU upload next frame.
	state.sizeDirty = true;

	state.baseAlpha[index] = LAYER_BASE_ALPHA[layer];
	state.twinkleAmp[index] = LAYER_TWINKLE_AMPLITUDE[layer] * randomRange(0.5, 1.0);
	state.twinkleFreq[index] = randomRange(TWINKLE_FREQ_MIN, TWINKLE_FREQ_MAX);
	state.twinklePhase[index] = Math.random() * Math.PI * 2;
	state.alphas[index] = state.baseAlpha[index];
}

function buildEmberState(): EmberState {
	const state: EmberState = {
		positions: new Float32Array(EMBER_COUNT * 3),
		displayPositions: new Float32Array(EMBER_COUNT * 3),
		phases: new Float32Array(EMBER_COUNT),
		speeds: new Float32Array(EMBER_COUNT),
		sizes: new Float32Array(EMBER_COUNT),
		alphas: new Float32Array(EMBER_COUNT),
		baseAlpha: new Float32Array(EMBER_COUNT),
		twinkleAmp: new Float32Array(EMBER_COUNT),
		twinkleFreq: new Float32Array(EMBER_COUNT),
		twinklePhase: new Float32Array(EMBER_COUNT),
		layer: new Uint8Array(EMBER_COUNT),
		sizeDirty: true
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
// Smoke state — simpler single-layer variant of the same idea
// ---------------------------------------------------------------------------

interface SmokeState {
	positions: Float32Array;
	phases: Float32Array;
	speeds: Float32Array;
	sizes: Float32Array;
	alphas: Float32Array;
	baseAlpha: Float32Array;
	sizeDirty: boolean;
}

function initSmokeAt(index: number, state: SmokeState, yOverride?: number): void {
	const i3 = index * 3;
	state.positions[i3 + 0] = randomRange(-1.1, 1.1);
	state.positions[i3 + 1] = yOverride ?? randomRange(-1.3, 1.1);
	state.positions[i3 + 2] = 0.0;
	state.phases[index] = Math.random() * Math.PI * 2;
	state.speeds[index] = randomRange(0.6, 1.3);
	state.sizes[index] = randomRange(SMOKE_SIZE_RANGE[0], SMOKE_SIZE_RANGE[1]);
	state.baseAlpha[index] = randomRange(SMOKE_ALPHA_RANGE[0], SMOKE_ALPHA_RANGE[1]);
	state.alphas[index] = state.baseAlpha[index];
	state.sizeDirty = true;
}

function buildSmokeState(): SmokeState {
	const state: SmokeState = {
		positions: new Float32Array(SMOKE_COUNT * 3),
		phases: new Float32Array(SMOKE_COUNT),
		speeds: new Float32Array(SMOKE_COUNT),
		sizes: new Float32Array(SMOKE_COUNT),
		alphas: new Float32Array(SMOKE_COUNT),
		baseAlpha: new Float32Array(SMOKE_COUNT),
		sizeDirty: true
	};
	for (let i = 0; i < SMOKE_COUNT; i++) initSmokeAt(i, state);
	return state;
}

/** Mood multipliers applied on top of the base alpha/speed of every ember. */
export type EmberMood = {
	/** Multiplies LAYER_BASE_ALPHA (density/brightness feel). 1 = neutral. */
	alpha: number;
	/** Multiplies rise speed. 1 = neutral. */
	speed: number;
};

const NEUTRAL_MOOD: EmberMood = { alpha: 1, speed: 1 };

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

	// Smoke layer (separate small Points object, added to the same scene).
	private smokeGeometry!: THREE.BufferGeometry;
	private smokePositionAttr!: THREE.BufferAttribute;
	private smokeSizeAttr!: THREE.BufferAttribute;
	private smokeAlphaAttr!: THREE.BufferAttribute;
	private smokeMaterial!: THREE.ShaderMaterial;
	private smokeTexture!: THREE.CanvasTexture;
	private smokeState!: SmokeState;
	private smokePoints!: THREE.Points;

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

	// WebGL context loss/restore (iOS reclaims GPU contexts when backgrounded)
	private onContextLost: ((e: Event) => void) | null = null;
	private onContextRestored: (() => void) | null = null;
	private contextLost = false;

	// Cursor proximity (CPU-side alpha boost, no shader changes) — NDC (-1..1).
	private onPointerMove: ((e: PointerEvent) => void) | null = null;
	private cursorActive = false;
	private cursorTargetX = 0;
	private cursorTargetY = 0;
	private cursorX = 0;
	private cursorY = 0;

	// Section mood — lerped toward whatever setMood() last requested.
	private moodTarget: EmberMood = NEUTRAL_MOOD;
	private moodCurrent: EmberMood = { ...NEUTRAL_MOOD };

	// Forge-flare flash.
	private nextFlareAt = randomRange(FLARE_MIN_INTERVAL_S, FLARE_MAX_INTERVAL_S);
	private flareElapsed = -1; // -1 = not currently flaring

	// Scroll-coupled parallax (normalized, clamped clip-unit offset).
	private onScroll: (() => void) | null = null;
	private scrollOffset = 0;

	// Whole-page camera drift — 0 at the top of the page, 1 at the bottom.
	private scrollProgress = 0;
	private cameraRotCurrent = 0;
	private cameraZoomCurrent = 1;
	private cameraPanCurrent = 0;

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
		this.buildSmoke();

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

		// WebGL context loss/restore — prevent default so the browser fires a
		// 'webglcontextrestored' event, then rebuild the GPU resources.
		this.onContextLost = (e: Event) => {
			e.preventDefault();
			this.contextLost = true;
			this.pauseRAF();
		};
		this.onContextRestored = () => {
			this.contextLost = false;
			// GPU-side geometry/material/texture were dropped — rebuild them.
			this.disposeGpuResources();
			this.buildEmbers();
			this.buildSmoke();
			// Re-apply renderer sizing for the (possibly new) context.
			const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
			this.renderer.setPixelRatio(dpr);
			this.renderer.setSize(this.width, this.height, false);
			this.material.uniforms.uDPR.value = dpr;
			this.smokeMaterial.uniforms.uDPR.value = dpr;
			if (this.running && !document.hidden) {
				this.resumeRAF();
			}
		};
		canvas.addEventListener('webglcontextlost', this.onContextLost, false);
		canvas.addEventListener('webglcontextrestored', this.onContextRestored, false);

		// Cursor proximity — only fine pointers (mouse); touch never triggers it,
		// matching the same finePointer gate used by CursorGlow/cursorTilt.
		const finePointer =
			typeof window.matchMedia === 'function' &&
			window.matchMedia('(hover: hover) and (pointer: fine)').matches;
		if (finePointer) {
			this.onPointerMove = (e: PointerEvent) => {
				if (e.pointerType !== 'mouse') return;
				// Convert client coords to clip space (-1..1, y flipped to match
				// the same convention as the ember positions themselves).
				const rect = canvas.getBoundingClientRect();
				if (rect.width === 0 || rect.height === 0) return;
				this.cursorTargetX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
				this.cursorTargetY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
				this.cursorActive = true;
			};
			window.addEventListener('pointermove', this.onPointerMove, { passive: true });
		}

		// Scroll-coupled parallax — rAF-throttled read of scrollY, normalized by
		// viewport height and clamped so very long pages don't runaway the offset.
		// Also derives the whole-page scroll progress (0..1) the camera drift uses.
		let scrollTicking = false;
		this.onScroll = () => {
			if (scrollTicking) return;
			scrollTicking = true;
			requestAnimationFrame(() => {
				scrollTicking = false;
				const raw = (window.scrollY / Math.max(window.innerHeight, 1)) * 0.5;
				this.scrollOffset = Math.max(-PARALLAX_MAX_OFFSET, Math.min(PARALLAX_MAX_OFFSET, raw));

				const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
				this.scrollProgress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
			});
		};
		window.addEventListener('scroll', this.onScroll, { passive: true });
		this.onScroll();
	}

	private buildEmbers(): void {
		this.scene = new THREE.Scene();
		// z range includes 0 so points at z=0 are never clipped.
		this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

		this.state = buildEmberState();

		this.geometry = new THREE.BufferGeometry();

		this.positionAttr = new THREE.BufferAttribute(this.state.displayPositions, 3);
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

	/**
	 * Smoke/ash layer — same point-sprite technique as the embers (proven
	 * safe), a softer grey texture, NORMAL blending (not additive, so it reads
	 * as translucent haze rather than glow), added behind the embers.
	 */
	private buildSmoke(): void {
		this.smokeState = buildSmokeState();

		this.smokeGeometry = new THREE.BufferGeometry();

		this.smokePositionAttr = new THREE.BufferAttribute(this.smokeState.positions, 3);
		this.smokePositionAttr.setUsage(THREE.DynamicDrawUsage);
		this.smokeGeometry.setAttribute('position', this.smokePositionAttr);

		this.smokeSizeAttr = new THREE.BufferAttribute(this.smokeState.sizes, 1);
		this.smokeSizeAttr.setUsage(THREE.DynamicDrawUsage);
		this.smokeGeometry.setAttribute('aSize', this.smokeSizeAttr);

		this.smokeAlphaAttr = new THREE.BufferAttribute(this.smokeState.alphas, 1);
		this.smokeAlphaAttr.setUsage(THREE.DynamicDrawUsage);
		this.smokeGeometry.setAttribute('aAlpha', this.smokeAlphaAttr);

		this.smokeTexture = buildSmokeTexture();

		this.smokeMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uTexture: { value: this.smokeTexture },
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
					float edgeFade = 1.0 - smoothstep(0.65, 1.15, position.y);
					vAlpha = aAlpha * edgeFade;
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
			blending: THREE.NormalBlending,
			depthTest: false,
			depthWrite: false
		});

		this.smokePoints = new THREE.Points(this.smokeGeometry, this.smokeMaterial);
		// Behind the embers in draw order (lower renderOrder draws first).
		this.smokePoints.renderOrder = -1;
		this.scene.add(this.smokePoints);
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

	/**
	 * Set the target mood (density/speed feel) for the whole ember field.
	 * Lerped in over ~1-2s (see MOOD_LERP_RATE) so section changes never snap.
	 * Called by WebGLBackground as the active section changes.
	 */
	setMood(target: EmberMood): void {
		this.moodTarget = target;
	}

	/** Fully destroy all three.js resources and event listeners. */
	dispose(): void {
		this.stop();

		if (this.onVisibilityChange) {
			document.removeEventListener('visibilitychange', this.onVisibilityChange);
			this.onVisibilityChange = null;
		}

		if (this.onContextLost) {
			this.canvas.removeEventListener('webglcontextlost', this.onContextLost, false);
			this.onContextLost = null;
		}
		if (this.onContextRestored) {
			this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored, false);
			this.onContextRestored = null;
		}
		if (this.onPointerMove) {
			window.removeEventListener('pointermove', this.onPointerMove);
			this.onPointerMove = null;
		}
		if (this.onScroll) {
			window.removeEventListener('scroll', this.onScroll);
			this.onScroll = null;
		}

		this.resizeObserver?.disconnect();
		this.resizeObserver = null;

		this.disposeGpuResources();
		this.renderer.dispose();
	}

	/**
	 * Dispose the per-scene GPU resources (geometry, material, texture) without
	 * tearing down the renderer. Used on context restore (rebuild) and dispose.
	 */
	private disposeGpuResources(): void {
		this.geometry?.dispose();
		this.material?.dispose();
		this.texture?.dispose();
		this.smokeGeometry?.dispose();
		this.smokeMaterial?.dispose();
		this.smokeTexture?.dispose();
	}

	// -----------------------------------------------------------------------
	// Internal: RAF management
	// -----------------------------------------------------------------------

	private resumeRAF(): void {
		if (this.rafId !== null || this.contextLost) return;
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

		this.updateMood(dt);
		this.updateFlare(dt);
		this.updateCursor(dt);
		this.updateCameraDrift(dt);
		this.updateEmbers(dt);
		this.updateSmoke(dt);
		this.renderer.render(this.scene, this.camera);

		this.rafId = requestAnimationFrame((t) => this.loop(t));
	}

	/** Lerp the current mood multipliers toward whatever setMood() last set. */
	private updateMood(dt: number): void {
		const rate = Math.min(MOOD_LERP_RATE * dt, 1);
		this.moodCurrent.alpha += (this.moodTarget.alpha - this.moodCurrent.alpha) * rate;
		this.moodCurrent.speed += (this.moodTarget.speed - this.moodCurrent.speed) * rate;
	}

	/** Advance the rare forge-flare timer; sets flareElapsed >= 0 while active. */
	private updateFlare(dt: number): void {
		if (this.flareElapsed >= 0) {
			this.flareElapsed += dt;
			if (this.flareElapsed >= FLARE_DURATION_S) {
				this.flareElapsed = -1;
				this.nextFlareAt = this.totalTime + randomRange(FLARE_MIN_INTERVAL_S, FLARE_MAX_INTERVAL_S);
			}
			return;
		}
		if (this.totalTime >= this.nextFlareAt) {
			this.flareElapsed = 0;
		}
	}

	/** Smooth the cursor position toward its latest reported target. */
	private updateCursor(dt: number): void {
		if (!this.cursorActive) return;
		const rate = Math.min(CURSOR_LERP_RATE * dt, 1);
		this.cursorX += (this.cursorTargetX - this.cursorX) * rate;
		this.cursorY += (this.cursorTargetY - this.cursorY) * rate;
	}

	/**
	 * Rolls, pans and "breathes" the camera across the whole page's scroll
	 * range — distinct from the per-layer parallax above, which only offsets
	 * particle Y positions. This moves the camera itself: a roll that builds
	 * up from top to bottom, a horizontal pan that swings out and back, and a
	 * zoom that peaks around the page's midpoint. All lerped so scroll jitter
	 * never snaps the view.
	 */
	private updateCameraDrift(dt: number): void {
		const rate = Math.min(CAMERA_LERP_RATE * dt, 1);

		const targetRot = this.scrollProgress * CAMERA_ROTATION_MAX;
		this.cameraRotCurrent += (targetRot - this.cameraRotCurrent) * rate;
		this.camera.rotation.z = this.cameraRotCurrent;

		const targetZoom = 1 + Math.sin(this.scrollProgress * Math.PI) * CAMERA_ZOOM_AMPLITUDE;
		this.cameraZoomCurrent += (targetZoom - this.cameraZoomCurrent) * rate;
		this.camera.zoom = this.cameraZoomCurrent;
		this.camera.updateProjectionMatrix();

		const targetPan = Math.sin(this.scrollProgress * Math.PI) * CAMERA_PAN_AMPLITUDE;
		this.cameraPanCurrent += (targetPan - this.cameraPanCurrent) * rate;
		this.camera.position.x = this.cameraPanCurrent;
	}

	/** Current forge-flare strength (0..1), a smooth rise/fall over its duration. */
	private flareStrength(): number {
		if (this.flareElapsed < 0) return 0;
		const t = this.flareElapsed / FLARE_DURATION_S; // 0..1
		// Fast rise, slower fade — sin curve peaking near the start.
		return Math.sin(Math.min(t, 1) * Math.PI) ** 0.6;
	}

	private updateEmbers(dt: number): void {
		const {
			positions,
			displayPositions,
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
		const moodAlpha = this.moodCurrent.alpha;
		const moodSpeed = this.moodCurrent.speed;
		const flare = this.flareStrength();

		for (let i = 0; i < EMBER_COUNT; i++) {
			const i3 = i * 3;
			const l = layer[i];

			// Rise at layer-specific base speed × per-particle multiplier × mood.
			positions[i3 + 1] += LAYER_RISE_SPEED[l] * speeds[i] * moodSpeed * dt;

			// Horizontal sway — each ember has unique phase
			const swayFreq = EMBER_SWAY_FREQUENCY * Math.PI * 2;
			const sway = Math.sin(t * swayFreq + phases[i]) * LAYER_SWAY_AMPLITUDE[l];
			positions[i3 + 0] += sway * dt;

			// Twinkle: sine-based alpha oscillation at per-particle frequency
			const twinkle = Math.sin(t * twinkleFreq[i] * Math.PI * 2 + twinklePhase[i]) * twinkleAmp[i];
			let alpha = Math.max(0.02, baseAlpha[i] * moodAlpha + twinkle);

			// Forge-flare: near layer catches most of the reflected brightness.
			if (flare > 0) {
				const flareGain = l === 2 ? 1 : l === 1 ? 0.4 : 0.15;
				alpha += flare * FLARE_ALPHA_BOOST * flareGain;
			}

			// Cursor proximity: soft radial falloff, added on top.
			if (this.cursorActive) {
				const dx = positions[i3 + 0] - this.cursorX;
				const dy = positions[i3 + 1] - this.cursorY;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist < CURSOR_INFLUENCE_RADIUS) {
					const falloff = 1 - dist / CURSOR_INFLUENCE_RADIUS;
					alpha += falloff * falloff * CURSOR_ALPHA_BOOST;
				}
			}

			alphas[i] = alpha;

			// Recycle embers that have drifted off the top
			if (positions[i3 + 1] > 1.15) {
				initEmberAt(i, this.state, -1.15);
			}

			// Display position = intrinsic position + scroll parallax (per layer),
			// written to a SEPARATE array so parallax never accumulates into the
			// intrinsic simulation state above.
			displayPositions[i3 + 0] = positions[i3 + 0];
			displayPositions[i3 + 1] = positions[i3 + 1] + this.scrollOffset * PARALLAX_FRACTION[l];
			displayPositions[i3 + 2] = positions[i3 + 2];
		}

		this.positionAttr.needsUpdate = true;
		this.alphaAttr.needsUpdate = true;
		// Sizes only change on init/recycle — upload once when the flag is set.
		if (this.state.sizeDirty) {
			this.sizeAttr.needsUpdate = true;
			this.state.sizeDirty = false;
		}
	}

	private updateSmoke(dt: number): void {
		const { positions, phases, speeds, alphas, baseAlpha } = this.smokeState;
		const t = this.totalTime;

		for (let i = 0; i < SMOKE_COUNT; i++) {
			const i3 = i * 3;
			positions[i3 + 1] += SMOKE_RISE_SPEED * speeds[i] * this.moodCurrent.speed * dt;

			const swayFreq = SMOKE_SWAY_FREQUENCY * Math.PI * 2;
			positions[i3 + 0] += Math.sin(t * swayFreq + phases[i]) * SMOKE_SWAY_AMPLITUDE * dt;

			alphas[i] = baseAlpha[i] * this.moodCurrent.alpha;

			if (positions[i3 + 1] > 1.3) {
				initSmokeAt(i, this.smokeState, -1.3);
			}
		}

		this.smokePositionAttr.needsUpdate = true;
		this.smokeAlphaAttr.needsUpdate = true;
		if (this.smokeState.sizeDirty) {
			this.smokeSizeAttr.needsUpdate = true;
			this.smokeState.sizeDirty = false;
		}
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
		this.smokeMaterial.uniforms.uDPR.value = dpr;
	}
}
