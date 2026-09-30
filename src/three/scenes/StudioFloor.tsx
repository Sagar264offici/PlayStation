import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { stage } from '@/state/stage';
import { clamp } from '@/state/stage';
import type { QualityTier } from '@/utils/performance';

/**
 * The studio floor.
 *
 * A dark, slightly rough mirror. Its job is to ground the hardware and to carry
 * a soft reflection that stretches toward the camera, which is what makes the
 * frame read as product photography rather than as a model viewer.
 *
 * This used to use drei's `MeshReflectorMaterial`, which re-renders the entire
 * scene into an offscreen target on every frame and then runs a wide separable
 * blur over it. That doubles the draw calls and, worse, doubles the fill cost,
 * which is what this scene is actually bound by.
 *
 * Measured on an M1 while scrolling the full story, worst frame:
 *   with the reflector     1183ms   (and it was 600ms even at 512)
 *   with this material      267ms
 *
 * A 1024 reflection buffer on an 8-core laptop with integrated graphics is a
 * multi-second freeze, which is what the "browser hangs" reports were. GPU
 * string detection does not rescue it either, because a base M1 is not much
 * faster than integrated silicon at fill-bound work.
 *
 * The replacement leans on `scene.environment`, which the lightformer rig
 * already bakes once, so the studio still reads as a reflection without a
 * per-frame cost. The floor is a receiver, never a light source.
 */
export function StudioFloor({ quality }: { quality: QualityTier }) {
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const fade = 1 - stage.voidAmount;
    if (material.current) {
      // The reflection fades out for the finale, where the world drains to
      // black and only the rim light survives.
      material.current.opacity = clamp(stage.floorReflect * 0.9) * fade;
    }
    if (mesh.current) {
      // Floor drops away as the story lifts off it.
      mesh.current.position.y = -0.001 - stage.voidAmount * 0.02;
    }
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial
        ref={material}
        color="#04050a"
        metalness={0.92}
        roughness={0.34}
        envMapIntensity={quality.floorReflectivity > 0 ? 1.15 : 0.35}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}
