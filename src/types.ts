/**
 * Shared domain types.
 *
 * Everything the experience renders is declared here so the data layer
 * (`src/data`) and the render layer stay in sync.
 */

/* -------------------------------------------------------------------------- */
/* Assets                                                                      */
/* -------------------------------------------------------------------------- */

export type TextureSlot = 'color' | 'normal' | 'roughness' | 'metalness';

export interface TextureSet {
  color: string;
  normal: string;
  roughness: string;
  metalness: string;
}

export interface ModelAsset {
  /** Key used by the model registry, e.g. `ps5-console`. */
  id: string;
  label: string;
  /** Public URL of the binary FBX. */
  src: string;
  /** PBR maps shared by the textured body materials. */
  textures: TextureSet;
  /**
   * Material names inside the FBX that should receive the texture set.
   * Everything else falls back to a hand-tuned studio material.
   */
  texturedMaterials: string[];
  /**
   * Material names treated as light bars: dark base, blue emissive, they
   * catch the environment reflections.
   */
  emissiveMaterials: string[];
  /** Material names that should read as near-black rubber/plastic trim. */
  trimMaterials: string[];
  /** Longest axis in metres, used to normalise the drop-in scale. */
  realWorldHeight: number;
  triangles: number;
}

export interface VideoAsset {
  src: string;
  poster?: string;
  /** Duration in seconds when known ahead of time (lets the UI draw a bar). */
  duration?: number;
}

/* -------------------------------------------------------------------------- */
/* Games                                                                       */
/* -------------------------------------------------------------------------- */

export type GameSlotId = 'game-01' | 'game-02' | 'game-03';

export interface GameEntry {
  id: GameSlotId;
  /** `01`, `02`, `03` — shown as the slot index. */
  index: string;
  title: string;
  genre: string;
  /** One-line editorial standfirst. */
  description: string;
  /** Short technical metadata rows shown beside the player. */
  metadata: { label: string; value: string }[];
  /**
   * Video for this slot. `null` means the slot is reserved but no footage
   * has been supplied yet — the UI renders a "media pending" state rather
   * than inventing content.
   */
  video: VideoAsset | null;
  /** Optional still; falls back to the console render. */
  poster?: string;
  /** Accent tint (hex) used for the slot's rim light and UI highlights. */
  accent: string;
  /** Accent as an rgb triple, for three.js colour maths. */
  accentRgb: [number, number, number];
  /** True once real media exists for the slot. */
  ready: boolean;
}

/* -------------------------------------------------------------------------- */
/* Storyboard                                                                  */
/* -------------------------------------------------------------------------- */

export type SceneId =
  | 'boot'
  | 'hardware'
  | 'performance'
  | 'immersion'
  | 'control'
  | 'games'
  | 'community'
  | 'finale';

export interface SceneMeta {
  id: SceneId;
  /** Two-digit label used in the nav and section eyebrows. */
  index: string;
  label: string;
  /** DOM id the nav links to. */
  anchor: string;
}

/* -------------------------------------------------------------------------- */
/* Stage                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The mutable object every GSAP timeline writes into and the render loop reads
 * from. It is deliberately plain data (no React state) so scrolling never
 * triggers a re-render.
 */
export interface StageState {
  /** Normalised scroll progress across the whole story, 0 → 1. */
  progress: number;

  /** Camera rig. */
  camX: number;
  camY: number;
  camZ: number;
  /** Look-at target. */
  lookX: number;
  lookY: number;
  lookZ: number;
  /** Field of view in degrees. */
  fov: number;
  /** Extra roll, used sparingly for the finale. */
  camRoll: number;

  /** Console transform. */
  consoleX: number;
  consoleY: number;
  consoleZ: number;
  consoleRotX: number;
  consoleRotY: number;
  consoleRotZ: number;
  consoleScale: number;
  /** 0 → 1 reveal used by the boot sequence. */
  consoleReveal: number;

  /** Controller transform. */
  padX: number;
  padY: number;
  padZ: number;
  padRotX: number;
  padRotY: number;
  padRotZ: number;
  padScale: number;
  padReveal: number;

  /** Lighting. */
  keyIntensity: number;
  rimIntensity: number;
  fillIntensity: number;
  /** Emissive strength on the console's light bar. */
  ledIntensity: number;
  /** Cool blue rim colour, mixed toward white for the finale. */
  rimHue: number;

  /** Atmosphere. */
  fogDensity: number;
  /** 0 → 1 presence of the drifting particle field. */
  particleOpacity: number;
  /** Reflections on the studio floor. */
  floorReflect: number;
  /** Background veil that fades the world toward black. */
  voidAmount: number;

  /** Pointer parallax, damped, in normalised device coords. */
  pointerX: number;
  pointerY: number;
}
