import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { stage } from '@/state/stage';
import type { QualityTier } from '@/utils/performance';

/**
 * Studio lighting rig.
 *
 * Product-photography lighting, not scene lighting: one large soft key from the
 * upper left, a cold rim from behind-right that separates the white shell from
 * the black room, a low fill to keep the shadow side readable, and a tight
 * kicker that skims the console's edge.
 *
 * Every intensity is driven by the scroll timeline so the hardware appears to
 * be relit as the story moves.
 */
export function StudioLighting({ quality }: { quality: QualityTier }) {
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const rimWarm = useRef<THREE.PointLight>(null);
  const fill = useRef<THREE.HemisphereLight>(null);
  const kicker = useRef<THREE.SpotLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);

  const { scene } = useThree();
  const rimColor = useMemo(() => new THREE.Color('#0ec8ff'), []);
  const rimTarget = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    if (key.current) key.current.intensity = 2.4 * stage.keyIntensity;
    if (rim.current) rim.current.intensity = 3.1 * stage.rimIntensity;
    if (fill.current) fill.current.intensity = 0.34 * stage.fillIntensity;
    if (ambient.current) ambient.current.intensity = 0.1 * stage.keyIntensity;

    if (rimWarm.current) {
      rimWarm.current.intensity = 0.9 * stage.rimIntensity;
      // The timeline slides `rimHue` to push the accent from cyan toward a
      // colder blue as the story turns cold.
      const hue = stage.rimHue;
      rimTarget.setHSL(hue % 1, 0.92, 0.6);
      rimWarm.current.color.lerp(rimTarget, 0.1);
    }

    if (kicker.current) {
      kicker.current.intensity = 5.5 * stage.rimIntensity;
      // The kicker tracks the pointer a little, so the edge highlight slides
      // across the shell as the user moves.
      kicker.current.position.x = 1.5 + stage.pointerX * 0.5;
      kicker.current.position.z = 1.1 - stage.pointerX * 0.35;
    }

    // Atmosphere is fog, not a post effect — cheaper and it correctly affects
    // the floor and the particles too.
    const fog = scene.fog as THREE.FogExp2 | null;
    if (fog) fog.density = stage.fogDensity * 0.42;
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={0.1} color="#20303f" />

      {/* Key: large soft source, upper front-left. */}
      <directionalLight
        ref={key}
        position={[-2.4, 3.1, 2.2]}
        intensity={2.4}
        color="#f2f6ff"
        castShadow={quality.contactShadow}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0012}
        shadow-normalBias={0.02}
      >
        <orthographicCamera attach="shadow-camera" args={[-1.6, 1.6, 1.6, -1.6, 0.1, 8]} />
      </directionalLight>

      {/* Rim: the cool separation light. This is the signature of the piece. */}
      <directionalLight ref={rim} position={[2.6, 1.5, -2.4]} intensity={3.1} color={rimColor} />

      {/* Near-field accent so the shell edge blooms instead of clipping. */}
      <pointLight ref={rimWarm} position={[1.1, 0.42, -0.9]} intensity={0.9} distance={4.2} decay={2} />

      {/* Fill: keeps the shadow side from going to pure black. */}
      <hemisphereLight ref={fill} args={['#25455c', '#05060a', 0.34]} />

      {/* Kicker: narrow beam that skims the console's edge highlight. */}
      <spotLight
        ref={kicker}
        position={[1.5, 1.6, 1.1]}
        angle={0.5}
        penumbra={1}
        distance={7}
        intensity={5.5}
        color="#bfe9ff"
      />
    </>
  );
}
