import { useSyncExternalStore } from 'react';
import type { StageState } from '@/types';

/**
 * The director's stage.
 *
 * Scroll, GSAP timelines and pointer tracking all write into a single mutable
 * object. The three.js render loop reads it inside `useFrame`. Nothing here is
 * React state, so scrubbing the page or moving the pointer causes zero
 * re-renders — the 3D scene just reads the latest values each frame.
 *
 * A separate, much smaller reactive store handles the handful of things the DOM
 * genuinely needs to re-render for (active scene, loader progress, slot index).
 */

/* -------------------------------------------------------------------------- */
/* Mutable stage                                                               */
/* -------------------------------------------------------------------------- */

export const stage: StageState = {
  progress: 0,

  camX: 0.62,
  camY: 0.28,
  camZ: 1.65,
  lookX: 0,
  lookY: 0.16,
  lookZ: 0,
  fov: 34,
  camRoll: 0,

  consoleX: 0.34,
  consoleY: 0,
  consoleZ: 0,
  consoleRotX: 0,
  consoleRotY: -0.34,
  consoleRotZ: 0,
  consoleScale: 1,
  consoleReveal: 0,

  padX: -0.46,
  padY: 0.055,
  padZ: 0.34,
  padRotX: -0.42,
  padRotY: 0.5,
  padRotZ: 0.16,
  padScale: 1,
  padReveal: 0,

  keyIntensity: 1,
  rimIntensity: 1,
  fillIntensity: 1,
  ledIntensity: 1,
  rimHue: 0.55,

  fogDensity: 0.16,
  particleOpacity: 0,
  floorReflect: 1,
  voidAmount: 0,

  pointerX: 0,
  pointerY: 0,
};

/* -------------------------------------------------------------------------- */
/* Reactive slice                                                              */
/* -------------------------------------------------------------------------- */

export type Phase = 'loading' | 'intro' | 'experience';

export interface UiState {
  phase: Phase;
  /** 0 → 1 across the loaded set. */
  loadProgress: number;
  /** Scene currently owning the camera. */
  activeScene: string;
  /** Index of the game slot on screen. */
  activeGame: number;
  /** True once the boot sequence has handed off to the 3D scene. */
  booted: boolean;
  soundOn: boolean;
  webgl: boolean;
  navOpen: boolean;
}

const initial: UiState = {
  phase: 'loading',
  loadProgress: 0,
  activeScene: 'boot',
  activeGame: 0,
  booted: false,
  soundOn: false,
  webgl: true,
  navOpen: false,
};

let state: UiState = initial;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export const ui = {
  get: () => state,
  set(patch: Partial<UiState>) {
    let changed = false;
    for (const key of Object.keys(patch) as (keyof UiState)[]) {
      if (state[key] !== patch[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    state = { ...state, ...patch };
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useUi<T>(selector: (value: UiState) => T): T {
  return useSyncExternalStore(
    ui.subscribe,
    () => selector(state),
    () => selector(initial),
  );
}

/* -------------------------------------------------------------------------- */
/* Easing helpers shared by the timelines                                      */
/* -------------------------------------------------------------------------- */

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Maps `v` from one range to another, clamped. */
export const mapRange = (v: number, inMin: number, inMax: number, outMin = 0, outMax = 1) => {
  if (inMax === inMin) return outMin;
  const t = clamp((v - inMin) / (inMax - inMin));
  return lerp(outMin, outMax, t);
};

/** Frame-rate independent damping. `lambda` is roughly "how fast", in 1/s. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));
