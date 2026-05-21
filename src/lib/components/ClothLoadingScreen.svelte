<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import * as THREE from 'three';
	import {
		CLOTH_BG,
		CLOTH_CONSTRAINT_ITERATIONS,
		CLOTH_DAMPING,
		CLOTH_DRAG_FOLLOW,
		CLOTH_FG,
		CLOTH_OVERFLOW,
		CLOTH_RESOLUTION,
		CLOTH_RETURN_BOOST,
		CLOTH_RETURN_FAR,
		CLOTH_RETURN_SPEED,
		CLOTH_SETTLE_THRESHOLD,
		CLOTH_SHEAR_STIFFNESS,
		CLOTH_Z_DAMPING,
		CLOTH_Z_DIP_FACTOR,
		CLOTH_Z_HIGHLIGHT,
		CLOTH_Z_MAX,
		CLOTH_Z_RETURN,
		CLOTH_Z_SHADOW,
		CLOTH_Z_WAVE_COUPLING,
		HOVER_RIPPLE_RADIUS,
		HOVER_RIPPLE_STRENGTH,
		CLOTH_COPY,
		CLOTH_FONT_BODY,
		CLOTH_FONT_PIXEL,
		DISMISS_DURATION_MS,
		DISMISS_THRESHOLD_FRAC,
		DISMISS_VELOCITY,
		type ClothCopy
	} from '$lib/constants/clothLoadingScreen';
	import { clothReady, isLoading } from '$lib/stores/loadingScreen';

	export let copy: ClothCopy = CLOTH_COPY;

	const ariaText = `${copy.smiley}. ${copy.bodyBefore}${copy.bodyPixel}${copy.bodyAfterFirst} ${copy.bodyAfterRest} ${copy.footer}`;
	const prefersReducedMotion =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	let host: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let renderer: THREE.WebGLRenderer;
	let scene: THREE.Scene;
	let camera: THREE.OrthographicCamera;
	let mesh: THREE.Mesh;
	let geometry: THREE.PlaneGeometry;
	let material: THREE.ShaderMaterial;
	let texture: THREE.CanvasTexture;
	let textCanvas: HTMLCanvasElement;

	let W = 0;
	let H = 0;
	let dpr = 1;
	let removed = false;

	const getExt = () => ({
		extW: W * (1 + 2 * CLOTH_OVERFLOW),
		extH: H * (1 + 2 * CLOTH_OVERFLOW),
		offX: -CLOTH_OVERFLOW * W,
		offY: -CLOTH_OVERFLOW * H
	});

	type Particle = {
		x: number;
		y: number;
		z: number;
		px: number;
		py: number;
		pz: number;
		ox: number;
		oy: number;
		pinned: boolean;
	};

	const N = CLOTH_RESOLUTION;
	let particles: Particle[] = [];
	let constraints: { a: number; b: number; rest: number; stiffness: number }[] = [];

	type DragState = {
		pointerId: number;
		particleIndex: number;
		originX: number;
		originY: number;
		targetX: number;
		targetY: number;
		maxDist: number;
	} | null;
	let drag: DragState = null;

	let lastHoverX = 0;
	let lastHoverY = 0;
	let hasHovered = false;

	let dismissing = false;
	let dismissStart = 0;
	let dismissVx = 0;
	let dismissVy = 0;
	let dismissOriginX = 0;
	let dismissOriginY = 0;

	let dragProgress = 0;
	let lastRenderedProgressBucket = 0;
	const PROGRESS_RENDER_STEP = 5;

	const idx = (i: number, j: number) => j * N + i;

	let resizeTimer: ReturnType<typeof setTimeout> | null = null;

	const applyResize = () => {
		const newW = window.innerWidth;
		const newH = window.innerHeight;
		if (newW === W && newH === H) return;
		W = newW;
		H = newH;
		dpr = Math.min(window.devicePixelRatio || 1, 2);

		if (renderer) {
			renderer.setSize(W, H, false);
			renderer.setPixelRatio(dpr);
		}
		if (camera) {
			camera.left = 0;
			camera.right = W;
			camera.top = 0;
			camera.bottom = H;
			camera.updateProjectionMatrix();
		}

		buildTextTexture();
		if (texture) {
			texture.dispose();
			texture = new THREE.CanvasTexture(textCanvas);
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.minFilter = THREE.LinearFilter;
			texture.magFilter = THREE.LinearFilter;
			if (material) {
				material.uniforms.map.value = texture;
			}
		}

		if (drag) {
			if (host && host.hasPointerCapture(drag.pointerId)) {
				host.releasePointerCapture(drag.pointerId);
			}
			drag = null;
			dragProgress = 0;
			lastRenderedProgressBucket = 0;
		}

		if (mesh && geometry) {
			const { extW: eW, extH: eH } = getExt();
			scene.remove(mesh);
			geometry.dispose();
			geometry = new THREE.PlaneGeometry(eW, eH, N - 1, N - 1);
			mesh = new THREE.Mesh(geometry, material);
			scene.add(mesh);
			initParticles();
			initConstraints();
		}
	};

	const resize = () => {
		if (resizeTimer) clearTimeout(resizeTimer);
		resizeTimer = setTimeout(applyResize, 120);
	};

	const buildTextTexture = () => {
		if (!textCanvas) textCanvas = document.createElement('canvas');
		const { extW: eW, extH: eH, offX: oX, offY: oY } = getExt();
		const texDpr = dpr;
		textCanvas.width = eW * texDpr;
		textCanvas.height = eH * texDpr;
		const ctx = textCanvas.getContext('2d');
		if (!ctx) return;

		ctx.setTransform(texDpr, 0, 0, texDpr, 0, 0);
		ctx.fillStyle = CLOTH_BG;
		ctx.fillRect(0, 0, eW, eH);
		ctx.fillStyle = CLOTH_FG;

		const innerX = -oX;
		const innerY = -oY;
		const padX = Math.max(24, W * 0.045);
		const minDim = Math.min(W, H);

		const smileySize = minDim * 0.22;
		const bodySize = Math.max(18, minDim * 0.04);
		const pixelSize = bodySize * 1.05;
		const progressSize = bodySize * 0.95;
		const footerSize = Math.max(13, minDim * 0.018);

		const smileyOpticalLeft = smileySize * 0.09;

		ctx.font = `200 ${smileySize}px ${CLOTH_FONT_BODY}`;
		ctx.textAlign = 'left';
		ctx.textBaseline = 'alphabetic';
		const smileyY = innerY + H * 0.42;
		ctx.fillText(copy.smiley, innerX + padX - smileyOpticalLeft, smileyY);

		const bodyLineHeight = bodySize * 1.4;
		const isNarrow = W < 700;
		const bodyMaxWidth = isNarrow ? W - padX * 2 : Math.min(W * 0.48, 760);
		const bodyStartY = innerY + H * 0.5 + bodySize * 0.6;

		type Run = { text: string; font: string; break?: boolean };
		const bodyFont = `300 ${bodySize}px ${CLOTH_FONT_BODY}`;
		const pixelFont = `400 ${pixelSize}px ${CLOTH_FONT_PIXEL}`;
		const runs: Run[] = [
			{ text: copy.bodyBefore, font: bodyFont },
			{ text: copy.bodyPixel, font: pixelFont },
			{ text: copy.bodyAfterFirst, font: bodyFont, break: true },
			{ text: copy.bodyAfterRest, font: bodyFont }
		];

		const tokens: Run[] = [];
		for (const run of runs) {
			const parts = run.text.split(/(\s+)/).filter((s) => s.length > 0);
			for (let i = 0; i < parts.length; i++) {
				tokens.push({
					text: parts[i],
					font: run.font,
					break: run.break && i === parts.length - 1
				});
			}
		}

		const lines: Run[][] = [[]];
		let lineWidth = 0;
		for (const tok of tokens) {
			ctx.font = tok.font;
			const w = ctx.measureText(tok.text).width;
			const isSpace = /^\s+$/.test(tok.text);
			if (!isSpace && lineWidth + w > bodyMaxWidth && lines[lines.length - 1].length > 0) {
				lines.push([]);
				lineWidth = 0;
			}
			if (isSpace && lineWidth === 0) continue;
			lines[lines.length - 1].push(tok);
			lineWidth += w;
			if (tok.break) {
				lines.push([]);
				lineWidth = 0;
			}
		}

		const measureLeftBearing = (font: string, text: string) => {
			ctx.font = font;
			return ctx.measureText(text).actualBoundingBoxLeft || 0;
		};

		ctx.textAlign = 'left';
		ctx.textBaseline = 'alphabetic';
		let y = bodyStartY;
		for (const line of lines) {
			const first = line[0];
			const startBearing = first ? measureLeftBearing(first.font, first.text) : 0;
			let x = innerX + padX - startBearing;
			for (const tok of line) {
				ctx.font = tok.font;
				ctx.fillText(tok.text, x, y);
				x += ctx.measureText(tok.text).width;
			}
			y += bodyLineHeight;
		}

		const progressY = y + bodyLineHeight * 0.6;
		const progressFont = `300 ${progressSize}px ${CLOTH_FONT_BODY}`;
		const progressText = `${dragProgress}${copy.progressSuffix}`;
		const progressBearing = measureLeftBearing(progressFont, progressText);
		ctx.font = progressFont;
		ctx.fillText(progressText, innerX + padX - progressBearing, progressY);

		const footerFont = `400 ${footerSize}px ${CLOTH_FONT_BODY}`;
		const footerLineHeight = footerSize * 1.5;
		const footerMaxWidth = isNarrow ? W - padX * 2 : Math.min(W * 0.6, 900);
		ctx.font = footerFont;
		const footerWords = copy.footer.split(/(\s+)/).filter((s) => s.length > 0);
		const footerLines: string[] = [''];
		let footerLineWidth = 0;
		for (const word of footerWords) {
			const ww = ctx.measureText(word).width;
			const isSpace = /^\s+$/.test(word);
			if (
				!isSpace &&
				footerLineWidth + ww > footerMaxWidth &&
				footerLines[footerLines.length - 1].length > 0
			) {
				footerLines.push('');
				footerLineWidth = 0;
			}
			if (isSpace && footerLineWidth === 0) continue;
			footerLines[footerLines.length - 1] += word;
			footerLineWidth += ww;
		}
		let footerY = progressY + Math.max(48, bodyLineHeight * 1.6);
		for (const line of footerLines) {
			const footerBearing = measureLeftBearing(footerFont, line);
			ctx.font = footerFont;
			ctx.fillText(line, innerX + padX - footerBearing, footerY);
			footerY += footerLineHeight;
		}

		if (texture) {
			texture.needsUpdate = true;
		}
	};

	const initParticles = () => {
		const { extW: eW, extH: eH, offX: oX, offY: oY } = getExt();
		particles = [];
		for (let j = 0; j < N; j++) {
			for (let i = 0; i < N; i++) {
				const x = oX + (i / (N - 1)) * eW;
				const y = oY + (j / (N - 1)) * eH;
				particles.push({
					x,
					y,
					z: 0,
					px: x,
					py: y,
					pz: 0,
					ox: x,
					oy: y,
					pinned: false
				});
			}
		}
	};

	const initConstraints = () => {
		const { extW: eW, extH: eH } = getExt();
		constraints = [];
		const restX = eW / (N - 1);
		const restY = eH / (N - 1);
		const restDiag = Math.hypot(restX, restY);
		for (let j = 0; j < N; j++) {
			for (let i = 0; i < N; i++) {
				const a = idx(i, j);
				if (i < N - 1) constraints.push({ a, b: idx(i + 1, j), rest: restX, stiffness: 1 });
				if (j < N - 1) constraints.push({ a, b: idx(i, j + 1), rest: restY, stiffness: 1 });
				if (i < N - 1 && j < N - 1) {
					constraints.push({
						a,
						b: idx(i + 1, j + 1),
						rest: restDiag,
						stiffness: CLOTH_SHEAR_STIFFNESS
					});
					constraints.push({
						a: idx(i + 1, j),
						b: idx(i, j + 1),
						rest: restDiag,
						stiffness: CLOTH_SHEAR_STIFFNESS
					});
				}
			}
		}
	};

	const stepPhysics = () => {
		const maxDiag = Math.hypot(W, H);

		if (drag) {
			const p = particles[drag.particleIndex];
			p.px = p.x;
			p.py = p.y;
			p.x += (drag.targetX - p.x) * CLOTH_DRAG_FOLLOW;
			p.y += (drag.targetY - p.y) * CLOTH_DRAG_FOLLOW;
			const dist = Math.hypot(p.x - drag.originX, p.y - drag.originY);
			if (dist > drag.maxDist) drag.maxDist = dist;
			const dipRaw = -dist * CLOTH_Z_DIP_FACTOR;
			p.z = Math.max(-CLOTH_Z_MAX, Math.min(CLOTH_Z_MAX, dipRaw));
			const threshold = maxDiag * DISMISS_THRESHOLD_FRAC;
			const pct = Math.min(100, Math.round((dist / threshold) * 100));
			dragProgress = pct;
			const bucket = Math.floor(pct / PROGRESS_RENDER_STEP);
			if (bucket !== lastRenderedProgressBucket) {
				lastRenderedProgressBucket = bucket;
				buildTextTexture();
			}
			if (drag.maxDist > threshold) {
				triggerDismiss(p.x - drag.originX, p.y - drag.originY);
			}
		} else if (!dismissing && dragProgress !== 0) {
			dragProgress = 0;
			lastRenderedProgressBucket = 0;
			buildTextTexture();
		}

		const dragX = drag ? drag.targetX : 0;
		const dragY = drag ? drag.targetY : 0;

		for (const p of particles) {
			if (p.pinned) continue;
			const vx = (p.x - p.px) * CLOTH_DAMPING;
			const vy = (p.y - p.py) * CLOTH_DAMPING;
			const vz = (p.z - p.pz) * CLOTH_Z_DAMPING;
			p.px = p.x;
			p.py = p.y;
			p.pz = p.z;
			p.x += vx;
			p.y += vy;
			p.z = Math.max(-CLOTH_Z_MAX, Math.min(CLOTH_Z_MAX, p.z + vz));
			if (!dismissing) {
				const ox = p.ox - p.x;
				const oy = p.oy - p.y;
				const speed = Math.hypot(vx, vy);
				const offset = Math.hypot(ox, oy);
				const settled = speed < CLOTH_SETTLE_THRESHOLD && !drag;
				let returnForce = CLOTH_RETURN_SPEED;
				if (settled && offset > 0.5) {
					returnForce = CLOTH_RETURN_BOOST;
				} else if (drag) {
					const distToDrag = Math.hypot(p.ox - dragX, p.oy - dragY);
					const distFrac = Math.min(1, distToDrag / maxDiag);
					returnForce = CLOTH_RETURN_SPEED + (CLOTH_RETURN_FAR - CLOTH_RETURN_SPEED) * distFrac;
				}
				p.x += ox * returnForce;
				p.y += oy * returnForce;
				p.z += -p.z * CLOTH_Z_RETURN;
			}
		}

		for (let j = 0; j < N; j++) {
			for (let i = 0; i < N; i++) {
				const a = particles[idx(i, j)];
				if (a.pinned) continue;
				let sum = 0;
				let count = 0;
				if (i > 0) {
					sum += particles[idx(i - 1, j)].z;
					count++;
				}
				if (i < N - 1) {
					sum += particles[idx(i + 1, j)].z;
					count++;
				}
				if (j > 0) {
					sum += particles[idx(i, j - 1)].z;
					count++;
				}
				if (j < N - 1) {
					sum += particles[idx(i, j + 1)].z;
					count++;
				}
				const avg = sum / count;
				a.z += (avg - a.z) * CLOTH_Z_WAVE_COUPLING;
			}
		}

		if (dismissing) {
			for (const p of particles) {
				const dist = Math.hypot(p.ox - dismissOriginX, p.oy - dismissOriginY);
				const proximity = 1 - Math.min(1, dist / maxDiag);
				const speedMult = 0.25 + proximity * 1.8;
				p.x += dismissVx * 0.016 * speedMult;
				p.y += dismissVy * 0.016 * speedMult;
			}
		}

		for (let k = 0; k < CLOTH_CONSTRAINT_ITERATIONS; k++) {
			for (const c of constraints) {
				const p1 = particles[c.a];
				const p2 = particles[c.b];
				const dx = p2.x - p1.x;
				const dy = p2.y - p1.y;
				const dist = Math.hypot(dx, dy) || 0.0001;
				const diff = ((dist - c.rest) / dist) * c.stiffness;
				const offsetX = dx * 0.5 * diff;
				const offsetY = dy * 0.5 * diff;
				if (!p1.pinned) {
					p1.x += offsetX;
					p1.y += offsetY;
				}
				if (!p2.pinned) {
					p2.x -= offsetX;
					p2.y -= offsetY;
				}
			}
		}
	};

	const updateMeshGeometry = () => {
		const pos = geometry.attributes.position as THREE.BufferAttribute;
		for (let i = 0; i < particles.length; i++) {
			const p = particles[i];
			pos.setXYZ(i, p.x, p.y, p.z);
		}
		pos.needsUpdate = true;
	};

	const nearestParticle = (px: number, py: number): number => {
		let best = 0;
		let bestDist = Infinity;
		for (let n = 0; n < particles.length; n++) {
			const p = particles[n];
			const d = Math.hypot(px - p.ox, py - p.oy);
			if (d < bestDist) {
				bestDist = d;
				best = n;
			}
		}
		return best;
	};

	const onPointerDown = (e: PointerEvent) => {
		if (dismissing) return;
		const i = nearestParticle(e.clientX, e.clientY);
		const p = particles[i];
		p.pinned = true;
		drag = {
			pointerId: e.pointerId,
			particleIndex: i,
			originX: p.ox,
			originY: p.oy,
			targetX: e.clientX,
			targetY: e.clientY,
			maxDist: 0
		};
		host.setPointerCapture(e.pointerId);
	};

	const onPointerMove = (e: PointerEvent) => {
		if (drag && e.pointerId === drag.pointerId) {
			drag.targetX = e.clientX;
			drag.targetY = e.clientY;
			return;
		}

		if (dismissing) return;

		if (hasHovered) {
			const dx = e.clientX - lastHoverX;
			const dy = e.clientY - lastHoverY;
			const speed = Math.hypot(dx, dy);
			if (speed > 0) {
				const radiusSq = HOVER_RIPPLE_RADIUS * HOVER_RIPPLE_RADIUS;
				for (const p of particles) {
					if (p.pinned) continue;
					const px = p.ox - e.clientX;
					const py = p.oy - e.clientY;
					const distSq = px * px + py * py;
					if (distSq < radiusSq) {
						const falloff = 1 - distSq / radiusSq;
						p.z -= speed * HOVER_RIPPLE_STRENGTH * falloff;
					}
				}
			}
		}

		lastHoverX = e.clientX;
		lastHoverY = e.clientY;
		hasHovered = true;
	};

	const onPointerUp = (e: PointerEvent) => {
		if (!drag || e.pointerId !== drag.pointerId) return;
		if (!dismissing) {
			const p = particles[drag.particleIndex];
			p.pinned = false;
		}
		if (host.hasPointerCapture(e.pointerId)) {
			host.releasePointerCapture(e.pointerId);
		}
		drag = null;
	};

	const triggerDismiss = (dx: number, dy: number) => {
		if (dismissing) return;
		dismissing = true;
		dismissStart = performance.now();
		const mag = Math.hypot(dx, dy) || 1;
		dismissVx = (dx / mag) * DISMISS_VELOCITY * 60;
		dismissVy = (dy / mag) * DISMISS_VELOCITY * 60;
		if (drag) {
			const p = particles[drag.particleIndex];
			dismissOriginX = p.x;
			dismissOriginY = p.y;
			if (host && host.hasPointerCapture(drag.pointerId)) {
				host.releasePointerCapture(drag.pointerId);
			}
		}
		for (const p of particles) {
			p.pinned = false;
		}
		drag = null;
		setTimeout(() => {
			cancelAnimationFrame(rafId);
			removed = true;
			isLoading.set(false);
		}, DISMISS_DURATION_MS);
	};

	let rafId = 0;
	let firstFrameRendered = false;
	const tick = () => {
		stepPhysics();
		updateMeshGeometry();

		if (dismissing && material) {
			const elapsed = performance.now() - dismissStart;
			const t = Math.min(1, elapsed / DISMISS_DURATION_MS);
			material.uniforms.opacity.value = 1 - t;
		}

		renderer.render(scene, camera);
		if (!firstFrameRendered) {
			firstFrameRendered = true;
			clothReady.set(true);
		}
		rafId = requestAnimationFrame(tick);
	};

	const preloadFonts = async () => {
		if (typeof document === 'undefined' || !document.fonts) return;
		const bodySize = Math.max(18, Math.min(window.innerWidth, window.innerHeight) * 0.04);
		const smileySize = Math.min(window.innerWidth, window.innerHeight) * 0.22;
		const fontSpecs = [
			`200 ${smileySize}px ${CLOTH_FONT_BODY}`,
			`300 ${bodySize}px ${CLOTH_FONT_BODY}`,
			`400 ${bodySize}px ${CLOTH_FONT_BODY}`,
			`400 ${bodySize}px ${CLOTH_FONT_PIXEL}`
		];
		try {
			await Promise.all(fontSpecs.map((spec) => document.fonts.load(spec)));
		} catch {
			return;
		}
	};

	const setupScene = () => {
		scene = new THREE.Scene();
		camera = new THREE.OrthographicCamera(0, W, 0, H, -1000, 1000);
		camera.position.z = 10;

		renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
		renderer.setSize(W, H, false);
		renderer.setPixelRatio(dpr);
		renderer.setClearColor(0x000000, 0);

		const { extW: eW, extH: eH } = getExt();
		geometry = new THREE.PlaneGeometry(eW, eH, N - 1, N - 1);

		texture = new THREE.CanvasTexture(textCanvas);
		texture.colorSpace = THREE.SRGBColorSpace;
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;

		material = new THREE.ShaderMaterial({
			uniforms: {
				map: { value: texture },
				zMax: { value: CLOTH_Z_MAX },
				highlight: { value: CLOTH_Z_HIGHLIGHT },
				shadow: { value: CLOTH_Z_SHADOW },
				opacity: { value: 1 }
			},
			vertexShader: `
        varying float vZ;
        varying vec2 vUv;
        void main() {
          vZ = position.z;
          vUv = uv;
          vec3 pos = position;
          pos.x += position.z * 0.55;
          pos.y += position.z * 0.4;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
			fragmentShader: `
        uniform sampler2D map;
        uniform float zMax;
        uniform float highlight;
        uniform float shadow;
        uniform float opacity;
        varying float vZ;
        varying vec2 vUv;
        void main() {
          vec4 base = texture2D(map, vUv);
          float normZ = clamp(vZ / zMax, -1.0, 1.0);
          float crest = max(normZ, 0.0);
          float trough = max(-normZ, 0.0);
          vec3 lit = base.rgb + vec3(crest * highlight) - vec3(trough * shadow);
          gl_FragColor = vec4(clamp(lit, 0.0, 1.0), base.a * opacity);
        }
      `,
			transparent: true,
			side: THREE.DoubleSide
		});

		mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);
	};

	onMount(async () => {
		isLoading.set(true);

		if (prefersReducedMotion) {
			removed = true;
			isLoading.set(false);
			clothReady.set(true);
			return;
		}

		W = window.innerWidth;
		H = window.innerHeight;
		dpr = Math.min(window.devicePixelRatio || 1, 2);

		await preloadFonts();
		if (removed) return;

		buildTextTexture();
		initParticles();
		initConstraints();
		setupScene();

		window.addEventListener('resize', resize);
		rafId = requestAnimationFrame(tick);
	});

	onDestroy(() => {
		if (typeof window === 'undefined') return;
		cancelAnimationFrame(rafId);
		if (resizeTimer) clearTimeout(resizeTimer);
		window.removeEventListener('resize', resize);
		geometry?.dispose();
		material?.dispose();
		texture?.dispose();
		renderer?.dispose();
	});
</script>

{#if !removed}
	<div
		class="cloth-host"
		class:dismissing
		bind:this={host}
		on:pointerdown={onPointerDown}
		on:pointermove={onPointerMove}
		on:pointerup={onPointerUp}
		on:pointercancel={onPointerUp}
		role="img"
		aria-label={ariaText}
	>
		<canvas bind:this={canvas} class="cloth-canvas" aria-hidden="true" />
	</div>
{/if}

<style lang="scss">
	.cloth-host {
		position: fixed;
		inset: 0;
		z-index: 9999;
		touch-action: none;
		cursor: grab;
		user-select: none;

		&:active {
			cursor: grabbing;
		}

		&.dismissing {
			pointer-events: none;
		}
	}

	.cloth-canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
</style>
