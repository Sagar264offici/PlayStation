import { useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { stage } from '@/state/stage';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * The interactive console.
 *
 * The user takes the camera: drag to orbit, wheel or pinch to move in, and the
 * pointer relights the hardware while they look at it.
 *
 * Two rules keep this from becoming a toy:
 *   1. The target is clamped — polar angle, distance and pan are all bounded,
 *      so the product can never be lost behind the camera or under the floor.
 *   2. There is always a way back. RESET VIEW restores the framing the
 *      timeline chose, and the controls disable themselves the moment the
 *      section leaves the viewport, handing the camera back to the story.
 */
export function InteractiveConsole({
  active,
  orbitRef,
}: {
  active: boolean;
  orbitRef: React.MutableRefObject<OrbitControlsImpl | null>;
}) {
  const isMobile = useIsMobile();
  const reduced = useReducedMotion();

  const MIN_DISTANCE = 0.62;
  const MAX_DISTANCE = 1.5;

  return (
    <OrbitControls
      ref={orbitRef as never}
      enabled={active && !reduced}
      enablePan={false}
      enableDamping
      dampingFactor={0.075}
      rotateSpeed={isMobile ? 0.85 : 0.62}
      zoomSpeed={0.7}
      // Keeps the product upright and always framed.
      minDistance={MIN_DISTANCE}
      maxDistance={MAX_DISTANCE}
      minPolarAngle={Math.PI * 0.22}
      maxPolarAngle={Math.PI * 0.66}
      minAzimuthAngle={-Math.PI * 0.72}
      maxAzimuthAngle={Math.PI * 0.72}
      target={[stage.lookX, 0.17, stage.lookZ]}
      // Disabled entirely when the section is off screen.
      makeDefault
    />
  );
}

/**
 * Pointer relighting.
 *
 * While the user is inspecting the hardware, the rim light follows the cursor
 * around the subject. It is a small move — the light never leaves the back-left
 * quadrant — but it makes the surface feel responsive to attention.
 */
export function InspectionLight({ active }: { active: boolean }) {
  const light = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    const node = light.current;
    if (!node || !active) return;

    // Project the pointer into the light's orbit around the subject.
    const radius = 1.15;
    const angle = stage.pointerX * Math.PI * 0.7 + 0.6;
    const height = 0.35 + stage.pointerY * 0.45;

    const targetX = Math.cos(angle) * radius;
    const targetY = Math.max(0.08, height);
    const targetZ = Math.sin(angle) * radius;

    const lambda = 4;
    node.position.x += (targetX - node.position.x) * (1 - Math.exp(-lambda * delta));
    node.position.y += (targetY - node.position.y) * (1 - Math.exp(-lambda * delta));
    node.position.z += (targetZ - node.position.z) * (1 - Math.exp(-lambda * delta));

    node.intensity += (2.4 - node.intensity) * (1 - Math.exp(-lambda * delta));
  });

  return <pointLight ref={light} position={[0.7, 0.5, 0.9]} intensity={0} distance={2.6} decay={2} color="#9fdcff" />;
}

/**
 * RESET VIEW.
 *
 * Animates the orbit camera back to the framing the scroll timeline had set, so
 * the button hands the user back to the composed shot rather than to a default
 * that would fight the timeline.
 */
export function ResetViewButton({
  orbitRef,
  active,
}: {
  orbitRef: React.MutableRefObject<OrbitControlsImpl | null>;
  active: boolean;
}) {
  const busy = useRef(false);

  const reset = () => {
    const controls = orbitRef.current;
    if (!controls || busy.current) return;

    busy.current = true;
    const camera = controls.object as THREE.PerspectiveCamera;
    const from = camera.position.clone();
    const fromTarget = controls.target.clone();

    const toTarget = new THREE.Vector3(stage.lookX, 0.17, stage.lookZ);
    // Reconstruct the timeline's camera distance along its own view direction so
    // the reset lands on the composed shot.
    const dir = from.clone().sub(fromTarget).normalize();
    const to = fromTarget.clone().add(dir.multiplyScalar(stage.camZ));

    const start = performance.now();
    const duration = 700;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      camera.position.copy(to);
      controls.target.copy(toTarget);
      controls.update();
      busy.current = false;
      return;
    }

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(from, to, eased);
      controls.target.lerpVectors(fromTarget, toTarget, eased);
      controls.update();
      if (t < 1) requestAnimationFrame(tick);
      else busy.current = false;
    };

    requestAnimationFrame(tick);
  };

  return (
    <button
      type="button"
      className="inspect-reset"
      onClick={reset}
      // Derived rather than latched into state: `active` already means "the
      // orbit controls are live", so mirroring it one render later via an
      // effect only added a frame where the button was disabled for no reason.
      disabled={!active}
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
        <path d="M13.5 8a5.5 5.5 0 1 1-1.9-4.16M13.5 2v3.2h-3.2" strokeLinecap="square" />
      </svg>
      <span>Reset view</span>
    </button>
  );
}
