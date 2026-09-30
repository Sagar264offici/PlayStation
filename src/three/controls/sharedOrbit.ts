import type { MutableRefObject } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

/**
 * The one place the camera can be handed over.
 *
 * The scroll timeline owns the camera by default. When the interactive console
 * section is engaged it mounts an `OrbitControls` and writes its instance here;
 * `CameraRig` checks the ref every frame and yields to it. Keeping the ref in
 * module scope rather than threading it through React context avoids a
 * re-render on the hot path and keeps the two sides decoupled.
 */
export const sharedOrbit: MutableRefObject<OrbitControlsImpl | null> = {
  current: null,
};
