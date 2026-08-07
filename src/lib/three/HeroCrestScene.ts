/**
 * HeroCrestScene.ts
 *
 * A small, self-contained three.js scene for the Hero logo: a real
 * `PerspectiveCamera` looking at the crest as a textured plane, so tilting
 * toward the cursor reads as genuine 3D depth instead of a flat image on an
 * affine CSS transform.
 *
 * Deliberately modest in scope: a single unlit crest plane (`MeshBasicMaterial`,
 * so it reads exactly as crisp as the static `<img>` it replaces). No dynamic
 * lighting/shadows — those would need real geometry variation to look like
 * anything, which a flat crest doesn't have. An earlier version paired the
 * crest with a second, further-back additive glow plane for parallax depth,
 * but that plane (intentionally larger than the crest, for the aura) got
 * hard-clipped by the canvas bounds — which match the crest's own bounding
 * box, not the glow's — producing a visible rectangular seam around the logo.
 * Dropped rather than fixed: the page already has a separate CSS ambient glow
 * (`.hero__glow`) behind the whole hero section, so the 3D glow was purely
 * redundant polish, not worth chasing canvas-sizing fixes for.
 *
 * Same lifecycle discipline as EmberScene: lazy-imported by the caller,
 * paused via `stop()` when the hero scrolls out of view (caller wires an
 * IntersectionObserver), respects prefers-reduced-motion (the caller simply
 * never constructs this when reduced motion is on), and has a full dispose().
 * WebGL context loss/restore is handled the same way.
 */

import * as THREE from 'three';

export type HeroCrestOptions = {
	/** Texture URL for the crest artwork (expects a transparent background). */
	src: string;
	/** Max devicePixelRatio used (capped for perf, same rationale as EmberScene). */
	maxDPR?: number;
};

/** Max tilt in degrees — matches the CSS `cursorTilt` action's default feel. */
const MAX_TILT_DEG = 8;
/** How quickly the plane's rotation eases toward the cursor target (per second). */
const TILT_LERP_RATE = 6;
/** Fraction of the camera's vertical frustum the crest plane fills at rest. */
const FRUSTUM_FILL = 0.86;

export class HeroCrestScene {
	private canvas: HTMLCanvasElement;
	private opts: Required<HeroCrestOptions>;

	private renderer!: THREE.WebGLRenderer;
	private scene!: THREE.Scene;
	private camera!: THREE.PerspectiveCamera;
	private crestMesh!: THREE.Mesh;
	private crestMaterial!: THREE.MeshBasicMaterial;
	private crestTexture!: THREE.Texture;

	private width = 0;
	private height = 0;
	private resizeObserver: ResizeObserver | null = null;

	private rafId: number | null = null;
	private lastTime = 0;
	private active = false; // true while the hero is in view AND started
	private disposed = false;

	private targetPx = 0; // cursor fraction, -0.5..0.5
	private targetPy = 0;
	private currentPx = 0;
	private currentPy = 0;

	private onContextLost: ((e: Event) => void) | null = null;
	private onContextRestored: (() => void) | null = null;
	private contextLost = false;

	/** Resolves once the crest texture has loaded (so the caller can swap the
	 *  fallback <img> out only once there's something to show in its place). */
	readonly ready: Promise<void>;

	constructor(canvas: HTMLCanvasElement, options: HeroCrestOptions) {
		this.canvas = canvas;
		this.opts = { maxDPR: 1.75, ...options };
		this.ready = this.init();
	}

	private async init(): Promise<void> {
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
		this.camera = new THREE.PerspectiveCamera(28, this.width / this.height, 0.1, 10);
		this.camera.position.z = 4;

		const loader = new THREE.TextureLoader();
		this.crestTexture = await loader.loadAsync(this.opts.src);
		this.crestTexture.colorSpace = THREE.SRGBColorSpace;

		const image = this.crestTexture.image as HTMLImageElement | undefined;
		const crestAspect = image?.width && image?.height ? image.width / image.height : 1;
		// Derived from the actual frustum (not a fixed constant) so the plane
		// never exceeds what the camera can see at z=0 — a hardcoded height here
		// previously clipped the top of the crest against the camera's FOV.
		// FRUSTUM_FILL leaves headroom for the tilt (rotating the plane grows its
		// projected bounds slightly) and a touch of breathing room at rest.
		const fovRad = (this.camera.fov * Math.PI) / 180;
		const visibleHeight = 2 * Math.tan(fovRad / 2) * this.camera.position.z;
		const crestHeight = visibleHeight * FRUSTUM_FILL;
		const crestWidth = crestHeight * crestAspect;

		this.crestMaterial = new THREE.MeshBasicMaterial({
			map: this.crestTexture,
			transparent: true,
			depthTest: false,
			depthWrite: false
		});
		this.crestMesh = new THREE.Mesh(
			new THREE.PlaneGeometry(crestWidth, crestHeight),
			this.crestMaterial
		);
		this.scene.add(this.crestMesh);

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

		// One render immediately so the crest is visible even before start().
		this.renderer.render(this.scene, this.camera);
	}

	/** Update the cursor target as a fraction of the tilt "zone" (-0.5..0.5 on
	 *  each axis) — same convention the CSS `cursorTilt` action uses. */
	setCursor(px: number, py: number): void {
		this.targetPx = px;
		this.targetPy = py;
	}

	/** Reset tilt to neutral (e.g. pointer left the zone). */
	resetCursor(): void {
		this.targetPx = 0;
		this.targetPy = 0;
	}

	/** Start (or resume) the render loop. */
	start(): void {
		this.active = true;
		this.resumeRAF();
	}

	/** Pause the render loop without disposing (e.g. hero scrolled out of view). */
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
		this.crestMaterial?.dispose();
		this.crestTexture?.dispose();
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

		const rate = Math.min(TILT_LERP_RATE * dt, 1);
		this.currentPx += (this.targetPx - this.currentPx) * rate;
		this.currentPy += (this.targetPy - this.currentPy) * rate;

		const maxRad = (MAX_TILT_DEG * Math.PI) / 180;
		this.crestMesh.rotation.x = -this.currentPy * maxRad;
		this.crestMesh.rotation.y = this.currentPx * maxRad;

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
