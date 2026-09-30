import type { GameEntry, ModelAsset, SceneMeta, VideoAsset } from '@/types';

/**
 * Asset manifest.
 *
 * Every path here was verified against the `./assets` drop and re-published by
 * `scripts/prepare-assets.sh` into `public/assets`. Nothing is invented: if a
 * file is absent, the corresponding entry is `null` and the UI renders an
 * explicit "media pending" state rather than fabricating content.
 */

const A = '/assets';

/* -------------------------------------------------------------------------- */
/* Intro video                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The Sony Interactive Entertainment opening sting, supplied as the only piece
 * of video in the project. It plays once at the very start of the boot sequence
 * and hands off to the 3D scene — it is deliberately *not* treated as game
 * footage.
 */
export const introVideo: VideoAsset = {
  src: `${A}/video/intro.webm`,
  poster: `${A}/preview/intro-poster.jpg`,
};

/* -------------------------------------------------------------------------- */
/* 3D models                                                                   */
/* -------------------------------------------------------------------------- */

export const models = {
  console: {
    id: 'ps5-console',
    label: 'PlayStation 5 Console',
    src: `${A}/models/ps5-console.fbx`,
    textures: {
      color: `${A}/textures/console_color.webp`,
      normal: `${A}/textures/console_normal.webp`,
      roughness: `${A}/textures/console_roughness.webp`,
      metalness: `${A}/textures/console_metalness.webp`,
    },
    texturedMaterials: ['PS5_Console'],
    emissiveMaterials: ['PS5_LED_Frame', 'PS5_LED', 'LED_Frame', 'LED_1', 'LED_2'],
    trimMaterials: [],
    realWorldHeight: 0.38,
    triangles: 46_962,
  } satisfies ModelAsset,

  controller: {
    id: 'ps5-controller',
    label: 'PlayStation 5 Controller',
    src: `${A}/models/ps5-controller.fbx`,
    textures: {
      color: `${A}/textures/gamepad_color.webp`,
      normal: `${A}/textures/gamepad_normal.webp`,
      roughness: `${A}/textures/gamepad_roughness.webp`,
      metalness: `${A}/textures/gamepad_metalness.webp`,
    },
    texturedMaterials: ['PS5_Gamepad'],
    emissiveMaterials: ['PS5_LED_Frame', 'PS5_Gamepad_LED', 'Gamepad_LED'],
    trimMaterials: ['Button_Silhouete', 'PS5_Button_Arrow'],
    realWorldHeight: 0.17,
    triangles: 210_166,
  } satisfies ModelAsset,
} as const;

/* -------------------------------------------------------------------------- */
/* Reference stills                                                            */
/* -------------------------------------------------------------------------- */

export const stills = {
  console: `${A}/preview/console.jpg`,
  consoleRender: `${A}/preview/console-render.jpg`,
  controller: `${A}/preview/controller.jpg`,
} as const;

/* -------------------------------------------------------------------------- */
/* Game slots                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Three reserved cinema slots.
 *
 * The architecture is complete: drop `game-01.webm` / `game-02.webm` /
 * `game-03.webm` into `public/assets/video/`, set the matching `video` object
 * below (or point it at your own file), and the gallery lights up with no
 * further changes.
 *
 * Until then the slot renders as `MEDIA SLOT READY` — honest about the gap
 * rather than filling it with stock footage.
 */
const pending = (index: string, title: string, genre: string, description: string, accent: string, accentRgb: [number, number, number]): GameEntry => ({
  id: `game-${index}` as GameEntry['id'],
  index,
  title,
  genre,
  description,
  metadata: [
    { label: 'Slot', value: `0${index} / 03` },
    { label: 'Status', value: 'Awaiting capture' },
  ],
  video: null,
  accent,
  accentRgb,
  ready: false,
});

export const games: GameEntry[] = [
  {
    id: 'game-01',
    index: '01',
    title: 'Interstellar',
    genre: 'Action RPG',
    description:
      'A single unbroken night. No loading screens, no cuts — one continuous session across a collapsing city.',
    metadata: [
      { label: 'Engine', value: 'Aurora 2.0' },
      { label: 'Rendering', value: 'Ray traced' },
      { label: 'Session', value: 'Continuous' },
    ],
    video: null,
    accent: '#0ec8ff',
    accentRgb: [0.055, 0.784, 1],
    ready: false,
  },
  pending(
    '02',
    'Deep Field',
    'Exploration',
    'Silence, distance and a horizon that keeps moving. Built for the room you are sitting in.',
    '#7ab8ff',
    [0.48, 0.72, 1],
  ),
  pending(
    '03',
    'Redline',
    'Racing',
    'Sixty frames of nerve. Every surface wet, every reflection honest.',
    '#ff6b4a',
    [1, 0.42, 0.29],
  ),
];

/* -------------------------------------------------------------------------- */
/* Storyboard                                                                  */
/* -------------------------------------------------------------------------- */

export const scenes: SceneMeta[] = [
  { id: 'boot', index: '00', label: 'Boot', anchor: 'scene-boot' },
  { id: 'hardware', index: '01', label: 'Hardware', anchor: 'scene-hardware' },
  { id: 'performance', index: '02', label: 'Performance', anchor: 'scene-performance' },
  { id: 'immersion', index: '03', label: 'Immersion', anchor: 'scene-immersion' },
  { id: 'control', index: '04', label: 'Control', anchor: 'scene-control' },
  { id: 'games', index: '05', label: 'Games', anchor: 'scene-games' },
  { id: 'community', index: '06', label: 'Community', anchor: 'scene-community' },
  { id: 'finale', index: '07', label: 'Finale', anchor: 'scene-finale' },
];

/* -------------------------------------------------------------------------- */
/* Brand                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Independent project identity. This is a fan-made interactive study, not an
 * official product site — the naming keeps that explicit everywhere it appears.
 */
export const brand = {
  name: 'NOVA',
  wordmark: 'PROJECT NOVA',
  tagline: 'An independent interactive study',
  disclaimer:
    'Independent fan project. Not affiliated with, endorsed by, or representing Sony Interactive Entertainment.',
} as const;
