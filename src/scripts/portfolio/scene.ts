/**
 * "Night harbour city made of data" — the WebGL environment behind the portfolio.
 *
 * Everything is procedural (no model files). One camera follows a Catmull-Rom path
 * through a district per chapter; `setProgress(p)` takes a continuous chapter index
 * (0 = hero ... N-1 = closing skyline) computed from scroll.
 *
 * Performance rules: instancing for anything numerous, animation in shaders where
 * possible, DPR capped, particle/building counts scaled by viewport area, rendering
 * paused while the tab is hidden, and a still-frame mode for reduced motion.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export type SceneData = {
  chapters: string[];
  topics: { id: string; name: string; color: string; count: number }[];
  /** [topicIndex, ageInDays] per post */
  stars: [number, number][];
};

export type SceneOptions = {
  reducedMotion: boolean;
  compact: boolean;
  onLabels?: (labels: { x: number; y: number; alpha: number }[]) => void;
};

export type PortfolioScene = {
  setProgress(p: number): void;
  setPointer(x: number, y: number): void;
  setHighlight(topic: number): void;
  start(): void;
  stop(): void;
  dispose(): void;
};

// ---------------------------------------------------------------- helpers
const FOG_COLOR = new THREE.Color('#0a1019');
const FOG_DENSITY = 0.0062;
const ACCENT = new THREE.Color('#f5c518');

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
/** 1 at chapter i, 0 one chapter away. */
const near = (p: number, i: number, width = 1) => clamp01(1 - Math.abs(p - i) / width);

const fogUniforms = () => ({
  uFogColor: { value: FOG_COLOR },
  uFogDensity: { value: FOG_DENSITY },
});

const FOG_GLSL = /* glsl */ `
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  vec3 applyFog(vec3 col, float depth) {
    float f = 1.0 - exp(-uFogDensity * uFogDensity * depth * depth);
    return mix(col, uFogColor, clamp(f, 0.0, 1.0));
  }
`;

const HASH_GLSL = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
`;

// District centres (x, z).
const D = {
  foundations: new THREE.Vector2(-70, -40),
  marketplace: new THREE.Vector2(62, -56),
  construction: new THREE.Vector2(-55, -112),
  claims: new THREE.Vector2(56, -128),
  civic: new THREE.Vector2(0, -192),
};

// Camera keyframes per chapter: [position, look target].
const KEYS: [THREE.Vector3, THREE.Vector3][] = [
  [new THREE.Vector3(0, 7, 72), new THREE.Vector3(0, 16, -60)], // harbour
  [new THREE.Vector3(-28, 36, 12), new THREE.Vector3(-68, 4, -42)], // foundations
  [new THREE.Vector3(26, 22, -12), new THREE.Vector3(64, 2, -58)], // marketplace
  [new THREE.Vector3(0, 42, -56), new THREE.Vector3(-56, 28, -114)], // construction
  [new THREE.Vector3(20, 24, -92), new THREE.Vector3(58, 13, -130)], // claims
  [new THREE.Vector3(12, 16, -126), new THREE.Vector3(0, 12, -194)], // civic
  [new THREE.Vector3(0, 24, -122), new THREE.Vector3(0, 118, -260)], // sky
  [new THREE.Vector3(0, 100, 128), new THREE.Vector3(0, 0, -110)], // skyline
];

/** Horizontal distance from (x, z) to segment a-b. */
function segDist(x: number, z: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = clamp01(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1));
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}

// ---------------------------------------------------------------- factory
export function createScene(canvas: HTMLCanvasElement, data: SceneData, opts: SceneOptions): PortfolioScene | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !opts.compact, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  const maxDpr = opts.compact ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#05080d');
  scene.fog = new THREE.FogExp2(FOG_COLOR, FOG_DENSITY);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.5, 1600);
  const uTime = { value: 0 };
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(o: T) => (disposables.push(o), o);

  // Area-based density: counts scale with viewport area (clamped).
  const areaScale = () => clamp01((window.innerWidth * window.innerHeight) / (1440 * 900)) * 0.6 + 0.4;
  const density = opts.compact ? 0.5 : areaScale();

  // ---------- lights (only for the lit civic/crane meshes)
  scene.add(new THREE.HemisphereLight(0x2a3a55, 0x05070a, 0.7));
  const moonLight = new THREE.DirectionalLight(0xa9c1ff, 0.65);
  moonLight.position.set(140, 120, -380);
  scene.add(moonLight);

  // ---------- sky dome
  const skyGeo = keep(new THREE.SphereGeometry(900, 32, 16));
  const skyMat = keep(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { uTop: { value: new THREE.Color('#03050a') }, uHorizon: { value: new THREE.Color('#13202f') } },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop; uniform vec3 uHorizon; varying vec3 vDir;
        void main() {
          float h = clamp(vDir.y * 2.2, 0.0, 1.0);
          vec3 col = mix(uHorizon, uTop, pow(h, 0.6));
          col += vec3(0.05, 0.08, 0.1) * exp(-abs(vDir.y) * 18.0);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    })
  );
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // ---------- background stars
  {
    const rand = mulberry(11);
    const n = Math.round(2600 * density);
    const pos = new Float32Array(n * 3);
    const tw = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = rand() * Math.PI * 2;
      const v = 0.04 + rand() * 0.96;
      const r = 820;
      pos[i * 3] = Math.cos(u) * Math.sqrt(1 - v * v) * r;
      pos[i * 3 + 1] = v * r;
      pos[i * 3 + 2] = Math.sin(u) * Math.sqrt(1 - v * v) * r;
      tw[i] = rand() * 6.28;
    }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aTw', new THREE.BufferAttribute(tw, 1));
    const m = keep(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: false,
        uniforms: { uTime, uPx: { value: renderer.getPixelRatio() } },
        vertexShader: /* glsl */ `
          attribute float aTw; uniform float uTime; uniform float uPx; varying float vA;
          void main() {
            vA = 0.35 + 0.35 * sin(uTime * 0.8 + aTw);
            gl_PointSize = (1.2 + fract(aTw * 3.7) * 1.4) * uPx;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vA;
          void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vec3(0.85, 0.9, 1.0), vA * (1.0 - d * 2.0)); }
        `,
      })
    );
    scene.add(new THREE.Points(g, m));
  }

  // ---------- moon
  {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    const grd = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(240,244,255,1)');
    grd.addColorStop(0.22, 'rgba(225,233,250,1)');
    grd.addColorStop(0.25, 'rgba(160,190,240,0.35)');
    grd.addColorStop(0.55, 'rgba(90,140,220,0.08)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 256, 256);
    const tex = keep(new THREE.CanvasTexture(c));
    tex.colorSpace = THREE.SRGBColorSpace;
    const moon = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: tex, fog: false, depthWrite: false, transparent: true })));
    moon.position.set(150, 95, -520);
    moon.scale.setScalar(150);
    scene.add(moon);
  }

  // ---------- ground + water
  const ground = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(900, 520).rotateX(-Math.PI / 2)),
    keep(new THREE.MeshBasicMaterial({ color: '#06090e' }))
  );
  ground.position.set(0, -0.05, -268);
  scene.add(ground);

  const rand = mulberry(42);
  // Light sources reflected in the water (x position + warm/cool).
  const reflections: number[] = [];
  for (let i = 0; i < 40; i++) reflections.push(-200 + rand() * 400, rand());

  const waterMat = keep(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime,
        uLights: { value: reflections },
        ...fogUniforms(),
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorld; varying float vDepth;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          vec4 mv = viewMatrix * w; vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform float uLights[80];
        varying vec3 vWorld; varying float vDepth;
        ${FOG_GLSL}
        ${HASH_GLSL}
        void main() {
          float shore = clamp((vWorld.z + 8.0) / 150.0, 0.0, 1.0);
          float ripple = vnoise(vec2(vWorld.x * 0.08, vWorld.z * 0.9 - uTime * 0.6)) * 0.6
                       + vnoise(vec2(vWorld.x * 0.3, vWorld.z * 2.4 + uTime * 0.9)) * 0.4;
          vec3 col = mix(vec3(0.012, 0.022, 0.035), vec3(0.03, 0.05, 0.075), ripple * 0.6);
          vec3 refl = vec3(0.0);
          for (int i = 0; i < 40; i++) {
            float lx = uLights[i * 2];
            float warm = uLights[i * 2 + 1];
            float d = (vWorld.x - lx) / (1.2 + shore * 5.0);
            float streak = exp(-d * d) * smoothstep(0.35, 0.95, ripple);
            refl += streak * mix(vec3(0.35, 0.65, 0.85), vec3(1.0, 0.62, 0.3), step(0.45, warm));
          }
          // moon path
          float md = (vWorld.x - 120.0) / (6.0 + shore * 18.0);
          refl += exp(-md * md) * smoothstep(0.45, 1.0, ripple) * vec3(0.55, 0.65, 0.85) * 0.9;
          col += refl * 0.22 * (1.0 - shore * 0.7);
          gl_FragColor = vec4(applyFog(col, vDepth), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    })
  );
  const water = new THREE.Mesh(keep(new THREE.PlaneGeometry(900, 240, 1, 1).rotateX(-Math.PI / 2)), waterMat);
  water.position.set(0, 0, 112);
  scene.add(water);

  // ---------- city buildings (one InstancedMesh, windows in the shader)
  const buildingGeo = keep(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
  const makeBuildingMaterial = () =>
    new THREE.ShaderMaterial({
      uniforms: { uTime, uCut: { value: 1e5 }, uReveal: { value: 1 }, ...fogUniforms() },
      vertexShader: /* glsl */ `
        attribute float aSeed; attribute vec3 aTint;
        varying vec3 vPos; varying vec3 vScale; varying vec3 vN; varying float vSeed; varying vec3 vTint; varying vec3 vWorld; varying float vDepth;
        void main() {
          mat4 m = modelMatrix;
          #ifdef USE_INSTANCING
            m = modelMatrix * instanceMatrix;
            vScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          #else
            vScale = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
          #endif
          vec4 w = m * vec4(position, 1.0);
          vPos = position; vN = normal; vSeed = aSeed; vTint = aTint; vWorld = w.xyz;
          vec4 mv = viewMatrix * w; vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform float uCut;
        varying vec3 vPos; varying vec3 vScale; varying vec3 vN; varying float vSeed; varying vec3 vTint; varying vec3 vWorld; varying float vDepth;
        ${FOG_GLSL}
        ${HASH_GLSL}
        void main() {
          if (vWorld.y > uCut) discard;
          float side = 1.0 - abs(vN.y);
          vec2 uv = abs(vN.x) > 0.5 ? vec2(vPos.z * vScale.z, vPos.y * vScale.y) : vec2(vPos.x * vScale.x, vPos.y * vScale.y);
          vec2 grid = uv / vec2(1.5, 1.15);
          vec2 cell = floor(grid); vec2 f = fract(grid);
          float win = step(0.2, f.x) * step(f.x, 0.74) * step(0.22, f.y) * step(f.y, 0.72);
          float face = floor(vN.x * 3.0 + vN.z * 5.0);
          float lit = step(0.6, hash(cell + vSeed * 13.7 + face));
          float flick = 0.82 + 0.18 * sin(uTime * 0.4 + hash(cell + 7.0) * 30.0);
          vec3 warm = vec3(1.0, 0.7, 0.4); vec3 cool = vec3(0.55, 0.82, 1.0);
          vec3 wc = mix(warm, cool, step(0.55, hash(cell * 1.3 + vSeed)));
          vec3 col = vec3(0.028, 0.036, 0.05) * mix(0.55, 1.0, clamp(vPos.y, 0.0, 1.0));
          col += side * win * lit * wc * vTint * flick * 0.72 * step(1.2, uv.y);
          col += vec3(0.03, 0.07, 0.09) * smoothstep(0.985, 1.0, vPos.y) * side;
          gl_FragColor = vec4(applyFog(col, vDepth), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
  const cityMat = keep(makeBuildingMaterial());
  // Keep the camera's flight path and each chapter's line of sight clear of towers.
  const pathSamples = new THREE.CatmullRomCurve3(KEYS.map((k) => k[0]), false, 'centripetal').getPoints(240);
  const blocked = (x: number, z: number, h: number) => {
    for (const s of pathSamples) {
      if (Math.hypot(s.x - x, s.z - z) < 18 && h > s.y - 30) return true;
    }
    for (const [p, t] of KEYS.slice(0, 6)) {
      if (segDist(x, z, p.x, p.z, p.x + (t.x - p.x) * 0.8, p.z + (t.z - p.z) * 0.8) < 11) return true;
    }
    return false;
  };
  {
    const avoid = Object.values(D);
    const max = Math.round(1100 * density);
    const mats: THREE.Matrix4[] = [];
    const seeds: number[] = [];
    const tints: number[] = [];
    const m4 = new THREE.Matrix4();
    let guard = 0;
    while (mats.length < max && guard++ < max * 8) {
      const x = -190 + rand() * 380;
      const z = -10 - rand() * 300;
      if (avoid.some((d) => Math.hypot(d.x - x, d.y - z) < (d === D.civic ? 32 : 28))) continue;
      if (Math.abs(x) < 7 && z > -170) continue; // central boulevard
      const downtown = Math.exp(-((x * x) / 5000 + ((z + 95) * (z + 95)) / 9000));
      let h = 4 + rand() * 10 + downtown * (18 + rand() * 46) * (rand() < 0.25 ? 1.5 : 1);
      // Low-rise ring around each district so the elevated cameras can see in.
      for (const d of avoid) {
        const dist = Math.hypot(d.x - x, d.y - z);
        if (dist < 70) h = Math.min(h, 7 + Math.max(0, dist - 28) * 0.75);
      }
      if (blocked(x, z, h)) continue;
      const w = 4 + rand() * 6;
      const d = 4 + rand() * 6;
      m4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d));
      mats.push(m4.clone());
      seeds.push(rand());
      const warmth = rand();
      tints.push(1, 0.9 + warmth * 0.1, 0.85 + warmth * 0.15);
    }
    const geo = buildingGeo.clone();
    keep(geo);
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(seeds), 1));
    geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(new Float32Array(tints), 3));
    const city = new THREE.InstancedMesh(geo, cityMat, mats.length);
    mats.forEach((m, i) => city.setMatrixAt(i, m));
    city.instanceMatrix.needsUpdate = true;
    city.computeBoundingSphere();
    scene.add(city);
  }

  // ---------- data rain (shader-animated points)
  const rainMat = keep(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime, uOpacity: { value: 1 }, uPx: { value: renderer.getPixelRatio() }, ...fogUniforms() },
      vertexShader: /* glsl */ `
        attribute float aSpeed; uniform float uTime; uniform float uPx; varying float vDepth; varying float vA;
        void main() {
          vec3 p = position;
          p.y = mod(p.y - uTime * aSpeed, 90.0);
          vA = smoothstep(0.0, 8.0, p.y) * smoothstep(90.0, 70.0, p.y);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vDepth = -mv.z;
          gl_PointSize = clamp(90.0 / vDepth, 1.0, 3.5) * uPx;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity; varying float vDepth; varying float vA;
        ${FOG_GLSL}
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float a = smoothstep(0.5, 0.0, length(c * vec2(2.4, 0.7)));
          float f = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
          gl_FragColor = vec4(vec3(0.45, 0.85, 1.0), a * vA * uOpacity * 0.55 * (1.0 - f));
        }
      `,
    })
  );
  {
    const n = Math.round(2400 * density);
    const pos = new Float32Array(n * 3);
    const spd = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = -170 + rand() * 340;
      pos[i * 3 + 1] = rand() * 90;
      pos[i * 3 + 2] = 90 - rand() * 360;
      spd[i] = 3 + rand() * 7;
    }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSpeed', new THREE.BufferAttribute(spd, 1));
    const pts = new THREE.Points(g, rainMat);
    pts.frustumCulled = false;
    scene.add(pts);
  }

  // ---------- 01 foundations: blueprint grid that draws itself in
  const blueprintMat = keep(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uReveal: { value: 0 }, uCenter: { value: D.foundations }, uTime, ...fogUniforms() },
      vertexShader: /* glsl */ `
        varying vec3 vWorld; varying float vDepth;
        void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }
      `,
      fragmentShader: /* glsl */ `
        uniform float uReveal; uniform vec2 uCenter; uniform float uTime; varying vec3 vWorld; varying float vDepth;
        ${FOG_GLSL}
        void main() {
          float r = distance(vWorld.xz, uCenter);
          float edge = uReveal * 46.0 - vWorld.y * 0.6;
          float a = smoothstep(edge + 2.0, edge - 2.0, r);
          float front = exp(-pow((r - edge) * 0.5, 2.0)) * step(0.01, uReveal) * step(uReveal, 0.999);
          vec3 col = vec3(0.35, 0.78, 0.95) * (0.55 + 0.45 * sin(vWorld.y * 0.8 - uTime * 1.5) * 0.2) + vec3(1.0, 0.85, 0.4) * front;
          float f = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
          gl_FragColor = vec4(col, (a * 0.55 + front * 0.8) * (1.0 - f));
        }
      `,
    })
  );
  {
    const v: number[] = [];
    const cx = D.foundations.x;
    const cz = D.foundations.y;
    const half = 34;
    for (let i = -half; i <= half; i += 2) {
      v.push(cx - half, 0.06, cz + i, cx + half, 0.06, cz + i);
      v.push(cx + i, 0.06, cz - half, cx + i, 0.06, cz + half);
    }
    const r = mulberry(7);
    for (let b = 0; b < 22; b++) {
      const bx = cx - 26 + r() * 52;
      const bz = cz - 26 + r() * 52;
      const w = 3 + r() * 5;
      const d = 3 + r() * 5;
      const h = 4 + r() * 18;
      const xs = [bx - w / 2, bx + w / 2];
      const zs = [bz - d / 2, bz + d / 2];
      for (const y of [0, h]) {
        v.push(xs[0]!, y, zs[0]!, xs[1]!, y, zs[0]!, xs[1]!, y, zs[0]!, xs[1]!, y, zs[1]!);
        v.push(xs[1]!, y, zs[1]!, xs[0]!, y, zs[1]!, xs[0]!, y, zs[1]!, xs[0]!, y, zs[0]!);
      }
      for (const x of xs) for (const z of zs) v.push(x, 0, z, x, h, z);
      for (let y = 3; y < h; y += 3) v.push(xs[0]!, y, zs[0]!, xs[1]!, y, zs[0]!);
    }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    scene.add(new THREE.LineSegments(g, blueprintMat));
  }

  // ---------- 02 marketplace: streets of moving car lights
  const carMat = keep(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime, uPx: { value: renderer.getPixelRatio() }, ...fogUniforms() },
      vertexShader: /* glsl */ `
        attribute vec4 aCar; // lane offset, start, speed, axis (0 = along x, 1 = along z)
        uniform float uTime; uniform float uPx; varying vec3 vCol; varying float vDepth;
        void main() {
          float L = 130.0;
          float s = mod(aCar.y + uTime * aCar.z, L) - L * 0.5;
          vec3 p = position;
          if (aCar.w < 0.5) { p.x += s; p.z += aCar.x; } else { p.z += s; p.x += aCar.x; }
          vCol = aCar.z > 0.0 ? vec3(1.0, 0.92, 0.75) : vec3(1.0, 0.18, 0.12);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vDepth = -mv.z;
          gl_PointSize = clamp(260.0 / vDepth, 1.5, 7.0) * uPx;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vCol; varying float vDepth;
        ${FOG_GLSL}
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          float f = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
          gl_FragColor = vec4(vCol * (0.6 + a), a * (1.0 - f));
        }
      `,
    })
  );
  {
    const cx = D.marketplace.x;
    const cz = D.marketplace.y;
    const road = keep(new THREE.MeshBasicMaterial({ color: '#0b0f15' }));
    const r1 = new THREE.Mesh(keep(new THREE.PlaneGeometry(130, 10).rotateX(-Math.PI / 2)), road);
    r1.position.set(cx, 0.02, cz);
    const r2 = new THREE.Mesh(keep(new THREE.PlaneGeometry(10, 130).rotateX(-Math.PI / 2)), road);
    r2.position.set(cx + 8, 0.03, cz);
    scene.add(r1, r2);
    const n = Math.round(260 * Math.max(density, 0.6));
    const pos = new Float32Array(n * 3);
    const car = new Float32Array(n * 4);
    const r = mulberry(3);
    for (let i = 0; i < n; i++) {
      const axis = i % 3 === 0 ? 1 : 0;
      const dir = r() < 0.5 ? -1 : 1;
      pos[i * 3] = axis ? cx + 8 : cx;
      pos[i * 3 + 1] = 0.5;
      pos[i * 3 + 2] = cz;
      car[i * 4] = dir * (1.4 + r() * 1.6);
      car[i * 4 + 1] = r() * 130;
      car[i * 4 + 2] = dir * (5 + r() * 9);
      car[i * 4 + 3] = axis;
    }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aCar', new THREE.BufferAttribute(car, 4));
    const pts = new THREE.Points(g, carMat);
    pts.frustumCulled = false;
    scene.add(pts);
    // street lamps
    const lampMat = keep(new THREE.MeshBasicMaterial({ color: '#ffb36b' }));
    const lampGeo = keep(new THREE.SphereGeometry(0.35, 8, 6));
    const lamps = new THREE.InstancedMesh(lampGeo, lampMat, 26);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 26; i++) {
      const s = -60 + (i % 13) * 10;
      const side = i < 13 ? -6.5 : 6.5;
      m4.makeTranslation(cx + s, 6, cz + side);
      lamps.setMatrixAt(i, m4);
    }
    scene.add(lamps);
  }

  // ---------- 03 construction: tower built by a rising cut plane, crane, data bricks
  const towerH = 62;
  const towerMat = keep(makeBuildingMaterial());
  const site = new THREE.Group();
  site.position.set(D.construction.x, 0, D.construction.y);
  scene.add(site);
  {
    const geo = keep(buildingGeo.clone());
    geo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(geo.attributes.position!.count).fill(0.37), 1));
    const tint = new Float32Array(geo.attributes.position!.count * 3).fill(1);
    geo.setAttribute('aTint', new THREE.BufferAttribute(tint, 3));
    const tower = new THREE.Mesh(geo, towerMat);
    tower.scale.set(14, towerH, 14);
    site.add(tower);
  }
  // scaffold lattice drawn above the cut line
  const scaffoldMat = keep(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uCut: { value: 0 }, ...fogUniforms() },
      vertexShader: /* glsl */ `
        varying vec3 vWorld; varying float vDepth;
        void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }
      `,
      fragmentShader: /* glsl */ `
        uniform float uCut; varying vec3 vWorld; varying float vDepth;
        ${FOG_GLSL}
        void main() {
          if (vWorld.y < uCut) discard;
          float f = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
          gl_FragColor = vec4(vec3(0.95, 0.66, 0.32), 0.42 * (1.0 - f));
        }
      `,
    })
  );
  {
    const v: number[] = [];
    const h = 7.4;
    for (const [x, z] of [[-h, -h], [h, -h], [h, h], [-h, h]] as const) v.push(x, 0, z, x, towerH + 2, z);
    for (let y = 0; y <= towerH + 2; y += 2.6) {
      v.push(-h, y, -h, h, y, -h, h, y, -h, h, y, h, h, y, h, -h, y, h, -h, y, h, -h, y, -h);
    }
    for (let y = 0; y < towerH; y += 5.2) {
      v.push(-h, y, -h, h, y + 5.2, -h, h, y, h, -h, y + 5.2, h);
    }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    site.add(new THREE.LineSegments(g, scaffoldMat));
  }
  const cap = new THREE.Mesh(keep(new THREE.BoxGeometry(15.2, 0.35, 15.2)), keep(new THREE.MeshBasicMaterial({ color: ACCENT })));
  site.add(cap);
  // crane
  const steel = keep(new THREE.MeshStandardMaterial({ color: '#2a3140', roughness: 0.7, metalness: 0.3 }));
  const craneTop = 78;
  const mast = new THREE.Mesh(keep(new THREE.BoxGeometry(1.4, craneTop, 1.4).translate(0, craneTop / 2, 0)), steel);
  mast.position.set(14, 0, -6);
  site.add(mast);
  const jibPivot = new THREE.Group();
  jibPivot.position.set(14, craneTop, -6);
  site.add(jibPivot);
  const jib = new THREE.Mesh(keep(new THREE.BoxGeometry(56, 1.2, 1.4).translate(18, 0, 0)), steel);
  const counter = new THREE.Mesh(keep(new THREE.BoxGeometry(6, 3, 2.4).translate(-11, -1, 0)), steel);
  const cable = new THREE.Mesh(keep(new THREE.BoxGeometry(0.12, 30, 0.12).translate(0, -15, 0)), steel);
  cable.position.x = 30;
  const beacon = new THREE.Mesh(keep(new THREE.SphereGeometry(0.55, 10, 8)), keep(new THREE.MeshBasicMaterial({ color: '#ff5a3c' })));
  beacon.position.set(45, 0.9, 0);
  jibPivot.add(jib, counter, cable, beacon);
  const workLight = new THREE.PointLight(0xffb070, 260, 90, 2);
  workLight.position.set(0, 20, 14);
  site.add(workLight);

  // data bricks: documents fly in from the sky and stack beside the tower
  const BRICKS = 150;
  const brickMat = keep(new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  const bricks = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(2.2, 0.9, 1.5)), brickMat, BRICKS);
  const brickStart: THREE.Vector3[] = [];
  const brickEnd: THREE.Vector3[] = [];
  const brickRot: THREE.Euler[] = [];
  const brickDelay: number[] = [];
  {
    const r = mulberry(5);
    const col = new THREE.Color();
    for (let i = 0; i < BRICKS; i++) {
      const layer = Math.floor(i / 25);
      const slot = i % 25;
      brickEnd.push(new THREE.Vector3(-26 + (slot % 5) * 2.4, 0.45 + layer * 0.95, -8 + Math.floor(slot / 5) * 1.7));
      brickStart.push(new THREE.Vector3(-60 + r() * 90, 40 + r() * 40, -60 + r() * 70));
      brickRot.push(new THREE.Euler(r() * 6, r() * 6, r() * 6));
      brickDelay.push(i / BRICKS);
      col.setRGB(0.55 + r() * 0.3, 0.42 + r() * 0.2, 0.06 + r() * 0.08);
      bricks.setColorAt(i, col);
    }
    site.add(bricks);
  }
  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpV = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  let lastBuild = -1;
  function setBuild(t: number) {
    if (Math.abs(t - lastBuild) < 1e-4) return;
    lastBuild = t;
    const cut = smooth(t) * (towerH + 0.4);
    towerMat.uniforms.uCut!.value = cut;
    scaffoldMat.uniforms.uCut!.value = cut;
    cap.position.y = cut;
    cap.visible = t > 0.001 && t < 0.999;
    for (let i = 0; i < BRICKS; i++) {
      const b = smooth((t * 1.6 - brickDelay[i]! * 0.6) * 1.0);
      tmpV.lerpVectors(brickStart[i]!, brickEnd[i]!, b);
      tmpV.y += Math.sin(b * Math.PI) * 6;
      tmpQ.setFromEuler(brickRot[i]!).slerp(new THREE.Quaternion(), b);
      const s = b < 0.02 ? 0.0001 : 1;
      tmpM.compose(tmpV, tmpQ, one.clone().multiplyScalar(s));
      bricks.setMatrixAt(i, tmpM);
    }
    bricks.instanceMatrix.needsUpdate = true;
  }
  setBuild(0);

  // ---------- 04 claims: documents fan open and fields are extracted
  const claims = new THREE.Group();
  claims.position.set(D.claims.x, 12, D.claims.y);
  scene.add(claims);
  const SHEETS = 16;
  const sheetTex = (() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 168;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#e9e3d6';
    ctx.fillRect(0, 0, 128, 168);
    ctx.fillStyle = '#b9b3a6';
    for (let y = 22; y < 150; y += 11) ctx.fillRect(14, y, 60 + ((y * 37) % 40), 4);
    ctx.fillStyle = '#f5c518';
    ctx.fillRect(14, 10, 40, 6);
    const t = keep(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const sheetMat = keep(new THREE.MeshBasicMaterial({ map: sheetTex, side: THREE.DoubleSide, color: new THREE.Color(0.55, 0.55, 0.55) }));
  const sheetGeo = keep(new THREE.PlaneGeometry(3.4, 4.4));
  const sheets: THREE.Mesh[] = [];
  for (let i = 0; i < SHEETS; i++) {
    const m = new THREE.Mesh(sheetGeo, sheetMat);
    claims.add(m);
    sheets.push(m);
  }
  const FIELDS = 12;
  const fieldMat = keep(new THREE.MeshBasicMaterial({ color: '#5ad1e6' }));
  const fields = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(5, 0.5, 0.2)), fieldMat, FIELDS);
  claims.add(fields);
  const linkPos = new Float32Array(FIELDS * 6);
  const linkGeo = keep(new THREE.BufferGeometry());
  linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPos, 3));
  const linkMat = keep(new THREE.LineBasicMaterial({ color: '#5ad1e6', transparent: true, opacity: 0 }));
  const links = new THREE.LineSegments(linkGeo, linkMat);
  links.frustumCulled = false;
  claims.add(links);
  let lastClaims = -1;
  function setClaims(t: number) {
    if (Math.abs(t - lastClaims) < 1e-4) return;
    lastClaims = t;
    const e = smooth(t);
    sheets.forEach((s, i) => {
      const k = i / (SHEETS - 1) - 0.5;
      s.position.set(-6 + k * 22 * e, i * 0.08 * (1 - e) + Math.sin((k + 0.5) * Math.PI) * 3 * e, -k * 4 * e);
      s.rotation.set(-0.35 * (1 - e), k * 1.2 * e, k * 0.25 * e + (1 - e) * 0.05 * i);
    });
    for (let i = 0; i < FIELDS; i++) {
      const y = 7 - i * 1.25;
      const reveal = smooth(e * 1.4 - i / FIELDS * 0.4);
      tmpM.compose(tmpV.set(16, y, 2), tmpQ.identity(), new THREE.Vector3(Math.max(reveal, 0.0001), 1, 1));
      fields.setMatrixAt(i, tmpM);
      const src = sheets[(i * 5) % SHEETS]!.position;
      linkPos.set([src.x, src.y, src.z, 13.5, y, 2], i * 6);
    }
    fields.instanceMatrix.needsUpdate = true;
    linkGeo.attributes.position!.needsUpdate = true;
    linkMat.opacity = 0.5 * e;
  }
  setClaims(0);

  // ---------- 05 civic hall with falling maple leaves
  const civic = new THREE.Group();
  civic.position.set(D.civic.x, 0, D.civic.y);
  scene.add(civic);
  {
    const stone = keep(new THREE.MeshStandardMaterial({ color: '#8d8a83', roughness: 0.85 }));
    const podium = new THREE.Mesh(keep(new THREE.BoxGeometry(40, 2.4, 22).translate(0, 1.2, 0)), stone);
    const steps = new THREE.Mesh(keep(new THREE.BoxGeometry(30, 1.2, 4).translate(0, 0.6, 12.5)), stone);
    const colGeo = keep(new THREE.CylinderGeometry(0.85, 1, 15, 16).translate(0, 7.5 + 2.4, 0));
    const cols = new THREE.InstancedMesh(colGeo, stone, 10);
    for (let i = 0; i < 8; i++) cols.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-15.75 + i * 4.5, 0, 8));
    cols.setMatrixAt(8, new THREE.Matrix4().makeTranslation(-15.75, 0, -8));
    cols.setMatrixAt(9, new THREE.Matrix4().makeTranslation(15.75, 0, -8));
    const beam = new THREE.Mesh(keep(new THREE.BoxGeometry(38, 2, 20).translate(0, 18.4, 0)), stone);
    const tri = new THREE.Shape([new THREE.Vector2(-20, 0), new THREE.Vector2(20, 0), new THREE.Vector2(0, 7)]);
    const ped = new THREE.Mesh(keep(new THREE.ExtrudeGeometry(tri, { depth: 20, bevelEnabled: false }).translate(0, 19.4, -10)), stone);
    const glow = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(32, 13)),
      keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.95, 0.45) }))
    );
    glow.position.set(0, 9, -7.5);
    const hallLight = new THREE.PointLight(0xffb36b, 420, 70, 2);
    hallLight.position.set(0, 9, 2);
    civic.add(podium, steps, cols, beam, ped, glow, hallLight);
  }
  // maple leaves: tumble on two axes, slip coupled to spin, two faces, varied per leaf
  const LEAVES = opts.compact ? 40 : 80;
  const leafTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d')!;
    ctx.translate(32, 34);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    const pts = [[0, -28], [6, -14], [16, -18], [12, -6], [26, -6], [20, 2], [24, 10], [10, 8], [8, 18], [2, 12], [0, 26], [-2, 12], [-8, 18], [-10, 8], [-24, 10], [-20, 2], [-26, -6], [-12, -6], [-16, -18], [-6, -14]];
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x!, y!) : ctx.moveTo(x!, y!)));
    ctx.closePath();
    ctx.fill();
    const t = keep(new THREE.CanvasTexture(c));
    return t;
  })();
  const leafMat = keep(
    new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { uMap: { value: leafTex }, ...fogUniforms() },
      vertexShader: /* glsl */ `
        attribute vec3 aColor; varying vec2 vUv; varying vec3 vCol; varying float vDepth;
        void main() {
          vUv = uv; vCol = aColor;
          vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
          vec4 mv = viewMatrix * w; vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; varying vec2 vUv; varying vec3 vCol; varying float vDepth;
        ${FOG_GLSL}
        void main() {
          float a = texture2D(uMap, vUv).a;
          if (a < 0.5) discard;
          vec3 c = gl_FrontFacing ? vCol : vCol * vec3(0.72, 0.62, 0.55) + 0.04;
          gl_FragColor = vec4(applyFog(c, vDepth), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    })
  );
  const leafGeo = keep(new THREE.PlaneGeometry(1.1, 1.1));
  const leafColors = new Float32Array(LEAVES * 3);
  const leafState = Array.from({ length: LEAVES }, (_, i) => {
    const r = mulberry(100 + i);
    const t = r();
    leafColors.set([0.75 + t * 0.2, 0.08 + t * 0.32, 0.0], i * 3);
    return {
      x: -26 + r() * 52,
      y: r() * 34,
      z: -6 + r() * 26,
      fall: 1.1 + r() * 1.6,
      spin: 1.5 + r() * 2.5,
      roll: 0.4 + r() * 1.2,
      slip: 0.6 + r() * 1.4,
      phase: r() * 6.28,
      scale: 0.7 + r() * 0.6,
    };
  });
  leafGeo.setAttribute('aColor', new THREE.InstancedBufferAttribute(leafColors, 3));
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, LEAVES);
  leaves.frustumCulled = false;
  civic.add(leaves);
  const leafEuler = new THREE.Euler();
  function updateLeaves(t: number, dt: number) {
    for (let i = 0; i < LEAVES; i++) {
      const L = leafState[i]!;
      L.y -= L.fall * dt;
      if (L.y < 0.2) {
        L.y = 30 + Math.random() * 6; // respawn above the hall
        L.x = -26 + Math.random() * 52;
      }
      const spin = t * L.spin + L.phase;
      const slipX = Math.sin(spin + Math.PI / 2) * L.slip; // slip follows the tumble, 90 degrees out of phase
      leafEuler.set(spin, t * L.roll + L.phase, Math.sin(spin * 0.5) * 0.6);
      tmpQ.setFromEuler(leafEuler);
      tmpM.compose(tmpV.set(L.x + slipX, L.y, L.z), tmpQ, new THREE.Vector3(L.scale, L.scale, L.scale));
      leaves.setMatrixAt(i, tmpM);
    }
    leaves.instanceMatrix.needsUpdate = true;
  }
  updateLeaves(0, 0);

  // ---------- 06 constellation: one star per blog post, clustered by topic
  const K = Math.max(1, data.topics.length);
  const topicColors = data.topics.map((t) => new THREE.Color(t.color));
  while (topicColors.length < 16) topicColors.push(new THREE.Color('#8a94a8'));
  const clusterCenters: THREE.Vector3[] = data.topics.map((_topic, k) => {
    const x = 52 + ((k + 0.5) / K - 0.5) * 190;
    const y = 112 + Math.sin(k * 1.9) * 24;
    const z = -282 - Math.cos(x / 160) * 18;
    return new THREE.Vector3(x, y, z);
  });
  const clusterRadius = data.topics.map((t) => 4 + Math.sqrt(t.count) * 1.3);
  const starMat = keep(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      uniforms: {
        uTime,
        uHighlight: { value: -1 },
        uOpacity: { value: 0 },
        uColors: { value: topicColors },
        uPx: { value: renderer.getPixelRatio() },
      },
      vertexShader: /* glsl */ `
        attribute float aTopic; attribute float aAge;
        uniform float uTime; uniform float uHighlight; uniform vec3 uColors[16]; uniform float uPx;
        varying vec3 vCol; varying float vA;
        void main() {
          int k = int(aTopic + 0.5);
          vCol = uColors[k];
          float on = uHighlight < -0.5 ? 1.0 : (abs(aTopic - uHighlight) < 0.5 ? 1.6 : 0.22);
          float fresh = 1.0 - clamp(aAge / 3650.0, 0.0, 1.0);
          vA = on * (0.55 + 0.45 * sin(uTime * 1.3 + aAge));
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (2.2 + fresh * 4.0) * (uHighlight < -0.5 ? 1.0 : (abs(aTopic - uHighlight) < 0.5 ? 1.5 : 0.8)) * uPx * (260.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity; varying vec3 vCol; varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float core = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vCol * (0.6 + core * 1.4), core * vA * uOpacity);
        }
      `,
    })
  );
  const chainMat = keep(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      uniforms: { uHighlight: starMat.uniforms.uHighlight!, uOpacity: starMat.uniforms.uOpacity!, uColors: starMat.uniforms.uColors! },
      vertexShader: /* glsl */ `
        attribute float aTopic; uniform float uHighlight; uniform vec3 uColors[16]; varying vec3 vCol; varying float vA;
        void main() {
          vCol = uColors[int(aTopic + 0.5)];
          vA = uHighlight < -0.5 ? 0.16 : (abs(aTopic - uHighlight) < 0.5 ? 0.5 : 0.04);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity; varying vec3 vCol; varying float vA;
        void main() { gl_FragColor = vec4(vCol, vA * uOpacity); }
      `,
    })
  );
  {
    const n = data.stars.length;
    const pos = new Float32Array(n * 3);
    const topic = new Float32Array(n);
    const age = new Float32Array(n);
    const r = mulberry(2026);
    const byTopic = new Map<number, number[]>();
    data.stars.forEach(([k, a], i) => {
      const c = clusterCenters[k] ?? clusterCenters[0]!;
      const rad = clusterRadius[k] ?? 8;
      const ang = r() * Math.PI * 2;
      const dist = Math.sqrt(-2 * Math.log(1 - r() * 0.999)) * rad * 0.45; // gaussian-ish falloff
      pos.set([c.x + Math.cos(ang) * dist, c.y + Math.sin(ang) * dist * 0.75, c.z + (r() - 0.5) * 10], i * 3);
      topic[i] = k;
      age[i] = a;
      if (!byTopic.has(k)) byTopic.set(k, []);
      byTopic.get(k)!.push(i);
    });
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aTopic', new THREE.BufferAttribute(topic, 1));
    g.setAttribute('aAge', new THREE.BufferAttribute(age, 1));
    const stars = new THREE.Points(g, starMat);
    stars.frustumCulled = false;
    scene.add(stars);
    // chain consecutive posts (newest first) within each topic
    const lv: number[] = [];
    const lt: number[] = [];
    for (const [k, idx] of byTopic) {
      const chain = idx.slice(0, 40);
      for (let j = 1; j < chain.length; j++) {
        const a = chain[j - 1]! * 3;
        const b = chain[j]! * 3;
        lv.push(pos[a]!, pos[a + 1]!, pos[a + 2]!, pos[b]!, pos[b + 1]!, pos[b + 2]!);
        lt.push(k, k);
      }
    }
    const cg = keep(new THREE.BufferGeometry());
    cg.setAttribute('position', new THREE.Float32BufferAttribute(lv, 3));
    cg.setAttribute('aTopic', new THREE.Float32BufferAttribute(lt, 1));
    const chains = new THREE.LineSegments(cg, chainMat);
    chains.frustumCulled = false;
    scene.add(chains);
  }

  // ---------- post-processing (restrained bloom; skipped on compact screens)
  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  if (!opts.compact) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.45, 0.82);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  // ---------- camera path
  const posCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => k[0]), false, 'centripetal');
  const tgtCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => k[1]), false, 'centripetal');
  const N = KEYS.length - 1;
  let targetP = 0;
  let curP = 0;
  const pointer = new THREE.Vector2();
  const pointerSmooth = new THREE.Vector2();
  let highlight = -1;
  const camPos = new THREE.Vector3();
  const camTgt = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  function layout() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (w < 2 || h < 2) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Shift the optical centre right on wide screens so each district sits beside the text column.
    if (w > 860) camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
    else camera.clearViewOffset();
    camera.fov = w > 860 ? 48 : 58;
    camera.updateProjectionMatrix();
    if (composer) {
      composer.setSize(w, h);
      bloom?.resolution.set(w / 2, h / 2);
    }
  }

  const labelOut: { x: number; y: number; alpha: number }[] = data.topics.map(() => ({ x: 0, y: 0, alpha: 0 }));
  const proj = new THREE.Vector3();
  function apply(p: number, t: number, dt: number) {
    const u = Math.min(Math.max(p / N, 0), 1);
    posCurve.getPoint(u, camPos);
    tgtCurve.getPoint(u, camTgt);
    // gentle pointer parallax in camera space
    right.subVectors(camTgt, camPos).cross(up).normalize();
    camPos.addScaledVector(right, pointerSmooth.x * 1.6).addScaledVector(up, -pointerSmooth.y * 0.9);
    camera.position.copy(camPos);
    camera.lookAt(camTgt);

    blueprintMat.uniforms.uReveal!.value = smooth((p - 0.35) / 0.65);
    setBuild(clamp01((p - 2.35) / 1.0));
    setClaims(clamp01((p - 3.4) / 0.9));
    const skyW = near(p, 6, 1.1);
    starMat.uniforms.uOpacity!.value = Math.max(0.25, skyW);
    rainMat.uniforms.uOpacity!.value = 0.35 + near(p, 0, 1) * 0.65 + near(p, 7, 1) * 0.4;
    starMat.uniforms.uHighlight!.value = highlight;
    jibPivot.rotation.y = -0.6 + Math.sin(t * 0.12) * 0.5 + p * 0.2;
    (beacon.material as THREE.MeshBasicMaterial).color.setRGB(Math.sin(t * 3) > 0 ? 1.6 : 0.25, 0.3, 0.15);
    if (near(p, 5, 1.6) > 0) updateLeaves(t, dt);

    if (opts.onLabels) {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      clusterCenters.forEach((c, k) => {
        proj.copy(c);
        proj.y += clusterRadius[k]! * 0.9;
        proj.project(camera);
        const vis = proj.z < 1 && Math.abs(proj.x) < 1.1 && Math.abs(proj.y) < 1.1;
        const o = labelOut[k]!;
        o.x = (proj.x * 0.5 + 0.5) * w;
        o.y = (-proj.y * 0.5 + 0.5) * h;
        o.alpha = vis ? skyW * (highlight < 0 || highlight === k ? 1 : 0.35) : 0;
      });
      opts.onLabels(labelOut);
    }
  }

  function render() {
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  // ---------- loop
  let raf = 0;
  let running = false;
  let last = performance.now();
  let elapsed = 0;
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;
    uTime.value = elapsed;
    curP += (targetP - curP) * (1 - Math.exp(-dt * 3.2));
    pointerSmooth.lerp(pointer, 1 - Math.exp(-dt * 2.5));
    apply(curP, elapsed, dt);
    render();
  }
  // Reduced motion: one designed still frame per chapter, rendered on demand.
  function still() {
    curP = Math.round(targetP);
    uTime.value = 12;
    apply(curP, 12, 0);
    render();
  }

  const ro = new ResizeObserver(() => {
    layout();
    if (!running) still();
  });
  ro.observe(canvas);
  layout();

  function onVisibility() {
    if (document.hidden) stopLoop();
    else if (wantRun) startLoop();
  }
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stopLoop();
    document.documentElement.classList.add('no-webgl');
  });

  let wantRun = false;
  function startLoop() {
    if (running || opts.reducedMotion) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stopLoop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  return {
    setProgress(p: number) {
      targetP = Math.min(Math.max(p, 0), N);
      if (opts.reducedMotion && Math.round(targetP) !== Math.round(curP)) still();
    },
    setPointer(x: number, y: number) {
      if (!opts.reducedMotion) pointer.set(x, y);
    },
    setHighlight(k: number) {
      highlight = k;
      if (!running) {
        starMat.uniforms.uHighlight!.value = k;
        apply(curP, uTime.value, 0);
        render();
      }
    },
    start() {
      wantRun = true;
      if (opts.reducedMotion) {
        curP = targetP;
        still();
      } else startLoop();
    },
    stop() {
      wantRun = false;
      stopLoop();
    },
    dispose() {
      stopLoop();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      composer?.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
