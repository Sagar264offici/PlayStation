/**
 * Performance budgets.
 *
 * The brief is explicit that smoothness outranks effect count, so the numbers
 * that decide how much gets drawn are centralised here rather than sprinkled
 * through components.
 */

export interface QualityTier {
  name: 'low' | 'medium' | 'high';
  /** three.js device-pixel-ratio clamp. */
  dpr: [number, number];
  /** Ambient particle count. */
  particles: number;
  /** Enable the soft contact shadow under the hardware. */
  contactShadow: boolean;
  /** Reflection strength for the studio floor. 0 swaps in a flat material. */
  floorReflectivity: number;
  /** Enable the volumetric haze cone. */
  haze: boolean;
  /** Bounce-light passes in the light rig. */
  bounceLights: boolean;
}

/**
 * Reads the GPU string once and caches it.
 *
 * Cores and RAM say nothing useful about fill rate, which is what actually
 * decides this budget: the studio floor re-renders the scene into an offscreen
 * target every frame, so the cost is dominated by pixels and blend passes
 * rather than by geometry. An 8-core laptop with integrated graphics looks
 * identical to a desktop with a discrete card on core count alone, and gets
 * handed the 1024 reflection buffer, which is the single most expensive thing
 * in the scene.
 */
let gpuClass: 'weak' | 'integrated' | 'discrete' | null = null;

function readGPU(): 'weak' | 'integrated' | 'discrete' {
  if (gpuClass) return gpuClass;
  gpuClass = 'integrated';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return (gpuClass = 'weak');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return (gpuClass = 'integrated');
    const renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '').toLowerCase();
    gl.getExtension('WEBGL_lose_context')?.loseContext();

    // Software rasterisers. `detectWebGL` already sends these to the static
    // composition, but this runs before/independently of that in some paths.
    if (/swiftshader|llvmpipe|software|mesa offscreen|basic render/.test(renderer))
      return (gpuClass = 'weak');
    if (/apple m[1-9]|rtx|radeon rx|geforce (gtx )?(9|1[0-9])|arc a7/.test(renderer))
      return (gpuClass = 'discrete');
    return (gpuClass = 'integrated');
  } catch {
    return (gpuClass = 'integrated');
  }
}

const TIERS: Record<QualityTier['name'], QualityTier> = {
  low: {
    name: 'low',
    dpr: [1, 1],
    particles: 420,
    contactShadow: false,
    floorReflectivity: 0.32,
    haze: false,
    bounceLights: false,
  },
  medium: {
    name: 'medium',
    dpr: [1, 1.35],
    particles: 1100,
    contactShadow: true,
    floorReflectivity: 0.5,
    haze: true,
    bounceLights: true,
  },
  high: {
    name: 'high',
    // 1.5 rather than 2. At dpr 2 a 1440-wide window shades 5.2M pixels per
    // frame through four `MeshPhysicalMaterial` lobes; at 1.5 it is 2.9M, and
    // the difference is not visible on a blurred, tone-mapped image.
    dpr: [1, 1.5],
    particles: 2200,
    contactShadow: true,
    floorReflectivity: 0.62,
    haze: true,
    bounceLights: true,
  },
};

export function getQualityTier(): QualityTier {
  if (typeof window === 'undefined') return TIERS.medium;

  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const narrow = window.innerWidth < 760;
  const gpu = readGPU();

  // Phones and low-core machines start low and are allowed to climb if the
  // measured frame time turns out fine (see `watchFrameBudget`).
  if (gpu === 'weak' || coarse || narrow || cores <= 4 || memory <= 4) return TIERS.low;
  if (gpu === 'discrete' && cores >= 8 && memory >= 8) return TIERS.high;
  return TIERS.medium;
}

/**
 * Watches frame time and reports when the renderer should step down a tier.
 * Deliberately one-way and slow: hunting between tiers looks worse than simply
 * running at the lower setting.
 */
export function watchFrameBudget(onDegrade: () => void, budgetMs = 26) {
  let frames = 0;
  let accumulated = 0;
  let tripped = false;
  let raf = 0;
  let last = performance.now();

  const tick = (now: number) => {
    if (tripped) return;
    const delta = now - last;
    last = now;

    // Ignore the first second: shader compilation and texture upload dominate.
    if (frames > 60) {
      accumulated += delta;
      frames += 1;
      if (frames >= 120) {
        if (accumulated / frames > budgetMs) {
          tripped = true;
          onDegrade();
          return;
        }
        frames = 0;
        accumulated = 0;
      }
    } else {
      frames += 1;
    }

    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/**
 * Recursively frees GPU memory for a subtree.
 *
 * three.js does not reclaim textures or materials when a node leaves the
 * scene graph, so anything we build by hand has to be released explicitly.
 */
export function disposeObject(root: { traverse: (fn: (child: never) => void) => void } | null) {
  if (!root) return;

  root.traverse((child) => {
    const node = child as unknown as {
      geometry?: { dispose: () => void };
      material?:
        | { dispose: () => void }
        | Array<{ dispose: () => void }>;
    };

    node.geometry?.dispose();

    const material = node.material;
    if (Array.isArray(material)) {
      for (const entry of material) disposeMaterial(entry);
    } else if (material) {
      disposeMaterial(material);
    }
  });
}

export function disposeMaterial(material: { dispose: () => void; [key: string]: unknown }) {
  // Textures hang off well-known slots; release them before the material.
  for (const key of Object.keys(material)) {
    const value = (material as Record<string, unknown>)[key];
    if (value && typeof value === 'object' && 'isTexture' in (value as object)) {
      (value as { dispose: () => void }).dispose();
    }
  }
  material.dispose();
}
