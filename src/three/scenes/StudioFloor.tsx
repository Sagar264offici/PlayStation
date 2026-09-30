import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshReflectorMaterial } from '@react-three/drei';
import type { MeshReflectorMaterial as MeshReflectorMaterialImpl } from '@react-three/drei/materials/MeshReflectorMaterial';
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
 * `voidAmount` fades the floor out for the finale, where the world drains to
 * black and only the rim light survives.
 */
export function StudioFloor({ quality }: { quality: QualityTier }) {
  const material = useRef<MeshReflectorMaterialImpl>(null);
  const mesh = useRef<THREE.Mesh>(null);

  const blur = useMemo(() => [280, 90] as [number, number], []);

  useFrame(() => {
    if (material.current) {
      material.current.opacity = clamp(stage.floorReflect * 0.9) * (1 - stage.voidAmount);
      // The reflection tightens as the world darkens, so the finale keeps a
      // single crisp highlight under the hardware.
      material.current.mixBlur = 1 - clamp(stage.floorReflect) * 0.55;
    }
    if (mesh.current) {
      // Floor drops away as the story lifts off it.
      mesh.current.position.y = -0.001 - stage.voidAmount * 0.02;
    }
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      {quality.floorReflectivity > 0 ? (
        <MeshReflectorMaterial
          ref={material}
          // Very dark base: the floor is a receiver, not a light source.
          color="#04050a"
          metalness={0.86}
          roughness={0.62}
          resolution={quality.floorReflectivity > 0.5 ? 1024 : 512}
          mirror={0.42}
          mixBlur={0.7}
          mixStrength={2.4}
          blur={blur}
          depthScale={1.1}
          minDepthThreshold={0.3}
          maxDepthThreshold={1.4}
          depthToBlurRatioBias={0.28}
          transparent
          opacity={0.9}
        />
      ) : (
        <meshStandardMaterial color="#04050a" metalness={0.7} roughness={0.7} />
      )}
    </mesh>
  );
}
