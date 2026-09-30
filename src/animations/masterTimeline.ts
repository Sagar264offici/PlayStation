import { gsap, ScrollTrigger, ease } from './gsap';
import { stage } from '@/state/stage';
import { scenes } from '@/data/assets';

/**
 * The master timeline.
 *
 * One GSAP timeline, one scrub, one story. Every camera move, model transform,
 * lighting change and atmosphere shift in the experience is a tween on this
 * timeline writing into the mutable `stage` object. The render loop reads
 * `stage`; the DOM never re-renders because of scroll.
 *
 * Scene boundaries are derived from the real section elements, so the
 * choreography stays locked to the layout if the copy changes length.
 */

export interface TimelineHandles {
  timeline: gsap.core.Timeline;
  refresh: () => void;
  destroy: () => void;
}

/** Time (in timeline seconds) allotted to each scene. */
const SCENE_BEATS: Record<string, number> = {
  boot: 1.2,
  hardware: 1.6,
  performance: 1.4,
  immersion: 1.3,
  control: 1.6,
  games: 1.5,
  community: 1.3,
  finale: 1.5,
};

/** Where each scene starts on the timeline, in seconds. */
function buildCueSheet(): { id: string; at: number }[] {
  const cues: { id: string; at: number }[] = [];
  let at = 0;
  for (const scene of scenes) {
    cues.push({ id: scene.id, at });
    at += SCENE_BEATS[scene.id] ?? 1.2;
  }
  return cues;
}

const cueAt = (id: string) => buildCueSheet().find((cue) => cue.id === id)?.at ?? 0;

export function createMasterTimeline(
  container: HTMLElement,
  options: { reducedMotion: boolean; isMobile: boolean },
): TimelineHandles {
  const { reducedMotion, isMobile } = options;
  const cue = cueAt;
  const mobile = isMobile;

  // Mobile uses a tighter, closer camera language — the models stay larger in
  // frame because there is no room to pull back.
  const cam = (x: number, y: number, z: number) =>
    mobile ? { x: x * 0.42, y: y * 0.9, z: z * 1.18 } : { x, y, z };

  const timeline = gsap.timeline({
    defaults: { ease: ease.cinematic },
    scrollTrigger: {
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      scrub: reducedMotion ? 0.2 : 1.05,
      invalidateOnRefresh: true,
    },
  });

  /* ---------------------------------------------------------------------- */
  /* SCENE 00 — BOOT                                                        */
  /* The camera settles into the hero framing. Reveal is already at 1 by the  */
  /* time the user can scroll (the intro sequence drives it), so this block   */
  /* only establishes the opening pose and the atmospheric floor.            */
  /* ---------------------------------------------------------------------- */
  timeline.call(
    () => {
      stage.progress = 0;
    },
    undefined,
    0,
  );

  const boot = cam(0.62, 0.3, 1.62);
  timeline.to(
    stage,
    {
      camX: boot.x,
      camY: boot.y,
      camZ: boot.z,
      lookY: 0.17,
      fov: mobile ? 42 : 34,
      ease: 'none',
      duration: cue('boot'),
    },
    cue('boot'),
  );

  /* ---------------------------------------------------------------------- */
  /* SCENE 01 — HARDWARE                                                    */
  /* Push in, swing around the console's shoulder, callouts land.           */
  /* ---------------------------------------------------------------------- */
  const hardware = cam(0.92, 0.22, 1.05);
  timeline.to(
    stage,
    {
      camX: hardware.x,
      camY: hardware.y,
      camZ: hardware.z,
      lookX: 0.16,
      lookY: 0.2,
      fov: mobile ? 40 : 30,
      consoleRotY: -0.95,
      consoleRotX: 0.05,
      consoleY: 0.01,
      consoleScale: 1.06,
      keyIntensity: 1.35,
      rimIntensity: 1.5,
      ledIntensity: 1.6,
      floorReflect: 1.15,
      duration: cue('hardware'),
    },
    cue('hardware'),
  );

  /* ---------------------------------------------------------------------- */
  /* SCENE 02 — PERFORMANCE                                                 */
  /* Drop low and look up: the hardware gets monumental. Rays up, haze in.   */
  /* ---------------------------------------------------------------------- */
  const perf = cam(0.5, -0.34, 0.92);
  timeline.to(
    stage,
    {
      camX: perf.x,
      camY: perf.y,
      camZ: perf.z,
      lookX: 0.1,
      lookY: 0.28,
      fov: mobile ? 46 : 38,
      consoleRotY: 0.42,
      consoleRotX: -0.08,
      consoleRotZ: 0.015,
      consoleScale: 1.12,
      rimIntensity: 2.1,
      keyIntensity: 0.85,
      fillIntensity: 0.6,
      fogDensity: 0.3,
      particleOpacity: 0.85,
      floorReflect: 0.9,
      duration: cue('performance'),
    },
    cue('performance'),
  );

  /* ---------------------------------------------------------------------- */
  /* SCENE 03 — IMMERSION                                                  */
  /* Rise above, orbit, atmosphere at its fullest. Blue saturates.          */
  /* ---------------------------------------------------------------------- */
  const immerse = cam(-0.78, 0.72, 1.35);
  timeline.to(
    stage,
    {
      camX: immerse.x,
      camY: immerse.y,
      camZ: immerse.z,
      lookX: 0,
      lookY: 0.16,
      fov: mobile ? 44 : 36,
      consoleRotY: 2.5,
      consoleRotX: 0.02,
      consoleScale: 1,
      rimIntensity: 2.4,
      rimHue: 0.56,
      fogDensity: 0.42,
      particleOpacity: 1,
      floorReflect: 1.35,
      duration: cue('immersion'),
    },
    cue('immersion'),
  );

  /* ---------------------------------------------------------------------- */
  /* SCENE 04 — CONTROL                                                     */
  /* The controller takes the frame. Console recedes and dims.               */
  /* ---------------------------------------------------------------------- */
  const control = cam(-0.34, 0.16, 0.86);
  timeline.to(
    stage,
    {
      camX: control.x,
      camY: control.y,
      camZ: control.z,
      lookX: -0.3,
      lookY: 0.14,
      fov: mobile ? 40 : 32,
      consoleX: 0.92,
      consoleY: 0.02,
      consoleZ: -0.7,
      consoleRotY: 3.6,
      consoleScale: 0.86,
      consoleReveal: 0.34,
      padX: -0.3,
      padY: 0.15,
      padZ: 0.06,
      padRotX: -0.62,
      padRotY: 0.2,
      padRotZ: 0.1,
      padScale: 1.34,
      padReveal: 1,
      keyIntensity: 1.5,
      rimIntensity: 2.6,
      ledIntensity: 2.4,
      fogDensity: 0.24,
      particleOpacity: 0.7,
      floorReflect: 0.7,
      duration: cue('control'),
    },
    cue('control'),
  );

  /* ---------------------------------------------------------------------- */
  /* SCENE 05 — GAMES                                                       */
  /* Pull back to a wide editorial frame; the world goes quiet behind the    */
  /* video so the footage carries the section.                              */
  /* ---------------------------------------------------------------------- */
  const games = cam(0.06, 0.1, 2.35);
  timeline.to(
    stage,
    {
      camX: games.x,
      camY: games.y,
      camZ: games.z,
      lookX: 0,
      lookY: 0.2,
      fov: mobile ? 42 : 33,
      consoleX: 0.5,
      consoleY: -0.06,
      consoleZ: -1.15,
      consoleRotY: 4.1,
      consoleScale: 0.7,
      consoleReveal: 0.2,
      padX: -0.52,
      padY: 0.02,
      padZ: -0.5,
      padRotX: -0.3,
      padRotY: 0.9,
      padScale: 0.7,
      padReveal: 0.28,
      keyIntensity: 0.7,
      rimIntensity: 1.5,
      ledIntensity: 1.5,
      fogDensity: 0.2,
      particleOpacity: 0.42,
      floorReflect: 0.95,
      voidAmount: 0.35,
      duration: cue('games'),
    },
    cue('games'),
  );

  /* ---------------------------------------------------------------------- */
  /* SCENE 06 — COMMUNITY                                                   */
  /* Rise into the constellation. Particles bloom.                           */
  /* ---------------------------------------------------------------------- */
  const community = cam(0.44, 0.86, 1.95);
  timeline.to(
    stage,
    {
      camX: community.x,
      camY: community.y,
      camZ: community.z,
      lookX: 0,
      lookY: 0.1,
      fov: mobile ? 44 : 36,
      consoleX: 0.24,
      consoleY: 0,
      consoleZ: -0.55,
      consoleRotY: 4.9,
      consoleScale: 0.92,
      consoleReveal: 0.85,
      padX: -0.3,
      padY: 0.09,
      padZ: 0.14,
      padRotX: -0.5,
      padRotY: 1.4,
      padScale: 0.95,
      padReveal: 0.9,
      keyIntensity: 1.1,
      rimIntensity: 2.2,
      ledIntensity: 2,
      fogDensity: 0.34,
      particleOpacity: 1,
      floorReflect: 1.2,
      voidAmount: 0.12,
      duration: cue('community'),
    },
    cue('community'),
  );

  /* ---------------------------------------------------------------------- */
  /* SCENE 07 — FINALE                                                      */
  /* Console and controller return to centre. The world drains to black and  */
  /* only the rim light is left.                                            */
  /* ---------------------------------------------------------------------- */
  const finale = cam(0.18, 0.2, 1.28);
  timeline.to(
    stage,
    {
      camX: finale.x,
      camY: finale.y,
      camZ: finale.z,
      lookX: 0,
      lookY: 0.19,
      fov: mobile ? 38 : 30,
      consoleX: 0.12,
      consoleY: 0,
      consoleZ: 0,
      consoleRotY: 5.9,
      consoleRotX: 0,
      consoleScale: 1.02,
      consoleReveal: 1,
      padX: -0.28,
      padY: 0.06,
      padZ: 0.26,
      padRotX: -0.36,
      padRotY: 5.5,
      padRotZ: 0.12,
      padScale: 1.02,
      padReveal: 1,
      keyIntensity: 0.34,
      rimIntensity: 2.8,
      rimHue: 0.53,
      ledIntensity: 3.2,
      fogDensity: 0.5,
      particleOpacity: 0.28,
      floorReflect: 1.5,
      voidAmount: 0.82,
      duration: cue('finale'),
    },
    cue('finale'),
  );

  // Overall scroll progress, for anything that wants the raw 0 → 1 value.
  timeline.eventCallback('onUpdate', () => {
    stage.progress = timeline.progress();
  });

  return {
    timeline,
    refresh: () => ScrollTrigger.refresh(),
    destroy: () => {
      timeline.scrollTrigger?.kill();
      timeline.kill();
    },
  };
}
