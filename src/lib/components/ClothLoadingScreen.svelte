<script lang="ts">
  import { onDestroy, onMount, createEventDispatcher } from "svelte";
  import * as THREE from "three";
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
    CLOTH_TEXT,
    DISMISS_DURATION_MS,
    DISMISS_THRESHOLD_FRAC,
    DISMISS_VELOCITY,
    type ClothText
  } from "$lib/constants/clothLoadingScreen";
  import { isLoading } from "$lib/stores/loadingScreen";

  export let text: ClothText = CLOTH_TEXT;

  const dispatch = createEventDispatcher<{ complete: void }>();

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

    if (mesh && geometry) {
      const { extW: eW, extH: eH } = getExt();
      scene.remove(mesh);
      geometry.dispose();
      geometry = new THREE.PlaneGeometry(eW, eH, N - 1, N - 1);
      geometry.translate(W / 2, H / 2, 0);
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
    if (!textCanvas) textCanvas = document.createElement("canvas");
    const { extW: eW, extH: eH, offX: oX, offY: oY } = getExt();
    const texDpr = dpr;
    textCanvas.width = eW * texDpr;
    textCanvas.height = eH * texDpr;
    const ctx = textCanvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(texDpr, 0, 0, texDpr, 0, 0);
    ctx.fillStyle = CLOTH_BG;
    ctx.fillRect(0, 0, eW, eH);

    ctx.fillStyle = CLOTH_FG;
    ctx.textBaseline = "alphabetic";
    const padding = Math.max(20, Math.min(W, H) * 0.04);
    const cornerSize = Math.min(W, H) * 0.11;
    const centerSize = Math.min(W, H) * 0.055;

    const drawWord = (
      word: string,
      x: number,
      y: number,
      size: number,
      align: CanvasTextAlign,
      baseline: CanvasTextBaseline,
      weight: number
    ) => {
      ctx.font = `${weight} ${size}px sans-serif`;
      ctx.textAlign = align;
      ctx.textBaseline = baseline;
      ctx.fillText(word, x, y);
    };

    const innerX = -oX;
    const innerY = -oY;
    drawWord(text.topLeft, innerX + padding, innerY + padding, cornerSize, "left", "top", 700);
    drawWord(text.topRight, innerX + W - padding, innerY + padding, cornerSize, "right", "top", 700);
    drawWord(text.bottomLeft, innerX + padding, innerY + H - padding, cornerSize, "left", "alphabetic", 700);
    drawWord(text.bottomRight, innerX + W - padding, innerY + H - padding, cornerSize, "right", "alphabetic", 700);
    drawWord(text.center, innerX + W / 2, innerY + H / 2, centerSize, "center", "middle", 500);

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
      const threshold = Math.hypot(W, H) * DISMISS_THRESHOLD_FRAC;
      if (drag.maxDist > threshold) {
        triggerDismiss(p.x - drag.originX, p.y - drag.originY);
      }
    }

    const maxDiag = Math.hypot(W, H);
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
        p.x += dismissVx * 0.016;
        p.y += dismissVy * 0.016;
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
    for (const p of particles) {
      p.pinned = false;
    }
    drag = null;
    setTimeout(() => {
      removed = true;
      isLoading.set(false);
      dispatch("complete");
    }, DISMISS_DURATION_MS);
  };

  let rafId = 0;
  const tick = () => {
    stepPhysics();
    updateMeshGeometry();

    if (dismissing) {
      const elapsed = performance.now() - dismissStart;
      const t = Math.min(1, elapsed / DISMISS_DURATION_MS);
      if (material) material.opacity = 1 - t;
    }

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
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
    geometry.translate(W / 2, H / 2, 0);

    texture = new THREE.CanvasTexture(textCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        zMax: { value: CLOTH_Z_MAX },
        highlight: { value: CLOTH_Z_HIGHLIGHT },
        shadow: { value: CLOTH_Z_SHADOW }
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
        varying float vZ;
        varying vec2 vUv;
        void main() {
          vec4 base = texture2D(map, vUv);
          float normZ = clamp(vZ / zMax, -1.0, 1.0);
          float crest = max(normZ, 0.0);
          float trough = max(-normZ, 0.0);
          vec3 lit = base.rgb + vec3(crest * highlight) - vec3(trough * shadow);
          gl_FragColor = vec4(clamp(lit, 0.0, 1.0), base.a);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
  };

  onMount(() => {
    isLoading.set(true);
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    buildTextTexture();
    initParticles();
    initConstraints();
    setupScene();

    window.addEventListener("resize", resize);
    rafId = requestAnimationFrame(tick);
  });

  onDestroy(() => {
    if (typeof window === "undefined") return;
    cancelAnimationFrame(rafId);
    if (resizeTimer) clearTimeout(resizeTimer);
    window.removeEventListener("resize", resize);
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
    role="presentation"
  >
    <canvas bind:this={canvas} class="cloth-canvas" />
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
