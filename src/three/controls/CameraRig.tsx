import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { stage, damp } from '@/state/stage';
import type { OrbitControls } from 'three-stdlib';
import type { MutableRefObject } from 'react';

interface CameraRigProps {
  reducedMotion: boolean;
  /** Set by the interactive console section while the user is dragging. */
  orbitRef: MutableRefObject<OrbitControls | null>;
  /** Pointer parallax strength, 0 disables it entirely. */
  parallax?: number;
}

/**
 * The camera.
 *
 * The scroll timeline owns the camera's position, target and FOV. On top of
 * that this rig adds:
 *   - damped pointer parallax, so the frame has depth under the cursor
 *   - a very slow idle drift, so a paused frame still breathes
 *   - an orbit override, used by the interactive console section
 *
 * Everything is damped in `useFrame` against the stage values, so a scrubbed
 * scroll produces a smooth move rather than a jump-cut.
 */
export function CameraRig({ reducedMotion, orbitRef, parallax = 1 }: CameraRigProps) {
  const { camera, size } = useThree();
  // The rig writes perspective-specific fields (fov), so narrow the type once
  // here rather than casting at every use site.
  const perspective = camera as THREE.PerspectiveCamera;

  const position = useRef(new THREE.Vector3(stage.camX, stage.camY, stage.camZ));
  const target = useRef(new THREE.Vector3(stage.lookX, stage.lookY, stage.lookZ));
  const parallaxOffset = useRef({ x: 0, y: 0 });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    /* ---- orbit override ------------------------------------------------- */
    const orbit = orbitRef.current;
    if (orbit && orbit.enabled) {
      // The section owns the camera; damp toward whatever the user dragged to
      // so releasing the pointer eases rather than snaps.
      position.current.x = damp(position.current.x, orbit.object.position.x, 5, dt);
      position.current.y = damp(position.current.y, orbit.object.position.y, 5, dt);
      position.current.z = damp(position.current.z, orbit.object.position.z, 5, dt);
      target.current.x = damp(target.current.x, orbit.target.x, 5, dt);
      target.current.y = damp(target.current.y, orbit.target.y, 5, dt);
      target.current.z = damp(target.current.z, orbit.target.z, 5, dt);
      camera.position.copy(position.current);
      camera.lookAt(target.current);
      return;
    }

    /* ---- timeline camera ------------------------------------------------ */
    const strength = reducedMotion ? 0 : parallax;

    // Portrait viewports need a wider, further-back camera or the hardware
    // crops. Driven by aspect rather than a breakpoint so it holds up when the
    // window is resized mid-scroll.
    const aspect = size.width / size.height;
    const pullBack = aspect < 1 ? 1 + (1 - aspect) * 0.85 : 1;
    const portraitLift = aspect < 1 ? (1 - aspect) * 0.42 : 0;

    parallaxOffset.current.x = damp(
      parallaxOffset.current.x,
      stage.pointerX * 0.075 * strength,
      2.6,
      dt,
    );
    parallaxOffset.current.y = damp(
      parallaxOffset.current.y,
      stage.pointerY * 0.05 * strength,
      2.6,
      dt,
    );

    // Idle drift: a slow figure-of-eight so a stationary camera is never
    // mathematically still.
    const idle = reducedMotion ? 0 : 1;
    const t = performance.now() * 0.00013;
    const driftX = Math.sin(t) * 0.016 * idle;
    const driftY = Math.cos(t * 0.77) * 0.011 * idle;

    const wantedX = (stage.camX + parallaxOffset.current.x + driftX) * pullBack;
    const wantedY = stage.camY + portraitLift + parallaxOffset.current.y + driftY;
    const wantedZ = stage.camZ * pullBack;

    position.current.x = damp(position.current.x, wantedX, 3.4, dt);
    position.current.y = damp(position.current.y, wantedY, 3.4, dt);
    position.current.z = damp(position.current.z, wantedZ, 3.4, dt);

    target.current.x = damp(target.current.x, stage.lookX + parallaxOffset.current.x * 0.35, 3.4, dt);
    target.current.y = damp(target.current.y, stage.lookY + parallaxOffset.current.y * 0.3, 3.4, dt);
    target.current.z = damp(target.current.z, stage.lookZ, 3.4, dt);

    camera.position.copy(position.current);
    camera.lookAt(target.current);

    const fov = stage.fov * (aspect < 1 ? 1.06 : 1);
    if (Math.abs(perspective.fov - fov) > 0.01) {
      perspective.fov = fov;
      perspective.updateProjectionMatrix();
    }

    if (Math.abs(camera.rotation.z - stage.camRoll) > 0.0005) {
      camera.rotation.z += (stage.camRoll - camera.rotation.z) * Math.min(1, dt * 2);
    }
  });

  return null;
}
