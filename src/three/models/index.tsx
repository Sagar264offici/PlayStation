import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group } from 'three';
import { useFBX, useTexture } from '@react-three/drei';
import type { ModelAsset } from '@/types';
import { applyModelMaterials, configureMaps } from '@/three/materials/modelMaterials';
import { stage } from '@/state/stage';
import { clamp, damp } from '@/state/stage';

/**
 * Shared FBX loading + PBR material binding.
 *
 * Returns a normalised group: origin at the base centre, longest axis matched
 * to the asset's real-world height, so callers can position it like a real
 * object on a floor rather than guessing at offsets.
 */
function useModel(asset: ModelAsset, onReady?: () => void) {
  const fbx = useFBX(asset.src) as Group;

  const kit = useTexture({
    color: asset.textures.color,
    normal: asset.textures.normal,
    roughness: asset.textures.roughness,
    metalness: asset.textures.metalness,
  }) as unknown as Record<string, THREE.Texture>;

  const bound = useMemo(() => {
    // The FBX is a shared cached object — clone so two mounts (hero + section)
    // never fight over the same materials.
    const clone = fbx.clone(true);
    const materials = applyModelMaterials(clone, asset, kit);
    return { root: clone, materials };
  }, [fbx, asset, kit]);

  useEffect(() => {
    configureMaps(kit as unknown as Record<string, THREE.Texture | null>);
    onReady?.();
  }, [kit, onReady]);

  useEffect(() => () => bound.materials.dispose(), [bound]);

  // Normalise scale, ground contact and horizontal centring, then leave the
  // rest of the transform to the caller.
  //
  // Orientation is deliberately *not* guessed at. Measured against the supplied
  // files: the console's longest axis is Y (38.1 vs 25.2 vs 9.6) and the
  // controller's is X (11.1 vs 7.5 vs 4.5), which is exactly the standing
  // console and the landscape-held controller respectively. A "longest axis
  // becomes vertical" heuristic would get the console right and then stand the
  // controller on its end, so the source pose is trusted and only size and
  // placement are normalised.
  const metrics = useMemo(() => {
    const box = new THREE.Box3().setFromObject(bound.root);
    const size = new THREE.Vector3();
    box.getSize(size);
    const centre = new THREE.Vector3();
    box.getCenter(centre);

    const longest = Math.max(size.x, size.y, size.z) || 1;
    const scale = asset.realWorldHeight / longest;

    // Neither file is authored around the origin — the console's geometry is
    // offset roughly -4.3 in x and -12.4 in z. Left uncorrected, that offset
    // becomes the pivot when the user orbits, so the model visibly wobbles
    // instead of turning on its own centre. The offset is pre-divided by scale
    // here because it is applied to a group that is already scaled.
    return {
      scale,
      lift: -box.min.y,
      offsetX: -centre.x,
      offsetZ: -centre.z,
    };
  }, [bound, asset.realWorldHeight]);

  return { root: bound.root, ledMaterials: bound.materials.ledMaterials, metrics };
}

/* -------------------------------------------------------------------------- */
/* Console                                                                     */
/* -------------------------------------------------------------------------- */

interface ConsoleModelProps {
  asset: ModelAsset;
  onReady?: () => void;
}

/**
 * The console.
 *
 * A pure function of `stage`: every frame it reads the scroll timeline's
 * transform for the console and writes it to the group. A slow float and a
 * pointer-driven yaw are layered on top so the hardware is never mechanically
 * still, and the light bars pulse with the timeline's LED intensity.
 */
export function ConsoleModel({ asset, onReady }: ConsoleModelProps) {
  const { root, ledMaterials, metrics } = useModel(asset, onReady);
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const { clock } = useThree();

  // Horizontal centring is static, so it is written once on mount rather than
  // every frame. The vertical lift is animated, so useFrame owns that.
  useLayoutEffect(() => {
    const node = inner.current;
    if (!node) return;
    node.position.x = metrics.offsetX;
    node.position.z = metrics.offsetZ;
  }, [metrics]);

  useFrame(() => {
    const node = group.current;
    const model = inner.current;
    if (!node || !model) return;

    const time = clock.elapsedTime;
    const reveal = stage.consoleReveal;

    node.position.set(stage.consoleX, stage.consoleY, stage.consoleZ);

    // Reveal is a scale + lift so the hardware grows out of the floor rather
    // than popping in at full size.
    const grow = 0.86 + 0.14 * clamp(reveal);
    node.scale.setScalar(stage.consoleScale * grow);

    // Pointer adds a few degrees of yaw/pitch on top of the scroll pose.
    const yaw = stage.consoleRotY + stage.pointerX * 0.16;
    const pitch = stage.consoleRotX - stage.pointerY * 0.09;
    node.rotation.set(pitch, yaw, stage.consoleRotZ);

    // Slow vertical float keeps the silhouette alive without spinning it.
    const float = Math.sin(time * 0.42) * 0.006 * reveal;
    model.position.y = metrics.lift + float;
    model.scale.setScalar(metrics.scale);

    // A settled console should not wobble while the user reads; ease the
    // ambient motion out as the section hands over to the controller.
    const settle = 1 - clamp((stage.padReveal - 0.4) * 1.2);
    model.rotation.z = Math.sin(time * 0.31) * 0.012 * settle * reveal;

    for (const material of ledMaterials) {
      material.emissiveIntensity = stage.ledIntensity * (0.85 + Math.sin(time * 1.4) * 0.06);
    }
  });

  return (
    <group ref={group}>
      <group ref={inner}>
        <primitive object={root} />
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Controller                                                                  */
/* -------------------------------------------------------------------------- */

interface ControllerModelProps {
  asset: ModelAsset;
  onReady?: () => void;
  /** Extra tilt applied when the controller is the subject of a section. */
  focusTilt?: number;
}

/**
 * The controller.
 *
 * Same contract as the console. The float is slightly stronger and slower
 * because the controller is the more intimate object in the frame.
 */
export function ControllerModel({ asset, onReady, focusTilt = 0 }: ControllerModelProps) {
  const { root, ledMaterials, metrics } = useModel(asset, onReady);
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const smoothed = useRef({ x: 0, y: 0 });
  const { clock } = useThree();

  useFrame((_, delta) => {
    const node = group.current;
    const model = inner.current;
    if (!node || !model) return;

    const time = clock.elapsedTime;
    const reveal = stage.padReveal;

    node.position.set(stage.padX, stage.padY, stage.padZ);
    node.scale.setScalar(stage.padScale * (0.9 + 0.1 * clamp(reveal)));

    // Tilt responds to the pointer with a little lag — the controller should
    // feel like it has mass.
    smoothed.current.x = damp(smoothed.current.x, stage.pointerX, 3.2, delta);
    smoothed.current.y = damp(smoothed.current.y, stage.pointerY, 3.2, delta);

    node.rotation.set(
      stage.padRotX - smoothed.current.y * 0.22 + focusTilt,
      stage.padRotY + smoothed.current.x * 0.34,
      stage.padRotZ + smoothed.current.x * 0.05,
    );

    const float = Math.sin(time * 0.55 + 1.1) * 0.008 * reveal;
    model.position.y = metrics.lift + float;
    model.scale.setScalar(metrics.scale);

    // A barely-there roll, again damped by focus so the control section is calm.
    const settle = 1 - clamp((stage.padScale - 1.05) * 2);
    model.rotation.z = Math.sin(time * 0.38) * 0.02 * settle * reveal;

    for (const material of ledMaterials) {
      material.emissiveIntensity = stage.ledIntensity * 0.9;
    }
  });

  return (
    <group ref={group}>
      <group ref={inner}>
        <primitive object={root} />
      </group>
    </group>
  );
}
