import { Component, useRef } from 'react';
import type { ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

/* -------------------------------------------------------------------------- */
/* Boundary                                                                     */
/* -------------------------------------------------------------------------- */

interface BoundaryProps {
  /**
   * Reported to the loader so a failed asset cannot hold the entry gate shut.
   * Without this, one 404 would leave the page stuck on the loading screen
   * forever, which is a worse outcome than a missing object.
   */
  onFailed: () => void;
  children: ReactNode;
}

interface BoundaryState {
  failed: boolean;
}

/**
 * Contains a model load or parse failure to a single object.
 *
 * `useFBX`/`useTexture` reject on a 404 or an unparseable file. Unhandled, that
 * rejection unwinds the whole canvas — taking the floor, the lighting and the
 * other model with it. The requirement is that a missing asset degrades rather
 * than crashes, so the failure is caught here and swapped for the placeholder.
 */
export class ModelBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  private reported = false;

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch() {
    // Swallowed deliberately: the visual degradation is the entire handling,
    // and there is no reporting backend to ship the error to.
    this.report();
  }

  componentDidUpdate() {
    this.report();
  }

  private report() {
    if (this.state.failed && !this.reported) {
      this.reported = true;
      this.props.onFailed();
    }
  }

  render() {
    if (this.state.failed) return <ModelFallback />;
    return this.props.children;
  }
}

/* -------------------------------------------------------------------------- */
/* Placeholder                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Stands in for a model that could not be loaded.
 *
 * Deliberately not a grey box: a wireframe volume with a scanning plane reads as
 * a legible "asset unavailable" state rather than as broken geometry. It keeps
 * the composition intact because the caller still places it on the same ground
 * point at the same scale as the real object.
 */
export function ModelFallback({ height = 0.38 }: { height?: number }) {
  const body = useRef<THREE.Group>(null);
  const plane = useRef<THREE.Mesh>(null);
  const { clock } = useThree();

  useFrame(() => {
    const time = clock.elapsedTime;
    if (body.current) body.current.rotation.y = time * 0.12;
    if (plane.current) plane.current.position.y = (Math.sin(time * 0.8) * 0.5 + 0.5) * height;
  });

  return (
    <group ref={body}>
      <mesh ref={plane}>
        <planeGeometry args={[height * 0.9, height * 0.9]} />
        <meshBasicMaterial
          color="#0ec8ff"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          wireframe
        />
      </mesh>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[height * 0.35, height, height * 0.35]} />
        <meshBasicMaterial color="#0ec8ff" wireframe transparent opacity={0.18} />
      </mesh>
    </group>
  );
}
