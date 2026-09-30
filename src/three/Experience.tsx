import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, Environment, Lightformer, Preload } from '@react-three/drei';
import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace } from 'three';
import * as THREE from 'three';
import { StudioLighting } from '@/three/scenes/StudioLighting';
import { StudioFloor } from '@/three/scenes/StudioFloor';
import { Atmosphere } from '@/three/scenes/Atmosphere';
import { CameraRig } from '@/three/controls/CameraRig';
import { sharedOrbit } from '@/three/controls/sharedOrbit';
import { ConsoleModel, ControllerModel } from '@/three/models';
import { ModelBoundary } from '@/three/models/ModelBoundary';
import { InteractiveConsoleStage } from '@/components/hardware/InteractiveConsoleStage';
import { models } from '@/data/assets';
import { stage } from '@/state/stage';
import { getQualityTier, watchFrameBudget, type QualityTier } from '@/utils/performance';

export interface ExperienceProps {
  reducedMotion: boolean;
  isMobile: boolean;
  onSceneReady: () => void;
  onConsoleReady: () => void;
  onControllerReady: () => void;
}

/**
 * The single persistent WebGL surface.
 *
 * One canvas lives behind the whole document for the entire experience. Scroll
 * never creates or destroys a scene — it moves the camera and the hardware
 * through the studio. That is what makes the story read as one continuous
 * timeline rather than a stack of separate sections.
 */
export function Experience({
  reducedMotion,
  isMobile,
  onSceneReady,
  onConsoleReady,
  onControllerReady,
}: ExperienceProps) {
  const [quality, setQuality] = useState<QualityTier>(() => getQualityTier());

  // Step quality down once if the frame budget is blown. One-way and slow to
  // trigger, so the page never visibly hunts between settings.
  useEffect(
    () =>
      watchFrameBudget(() => {
        setQuality((current) =>
          current.name === 'high' ? { ...current, ...stepDownMid() } : { ...current, ...stepDownLow() },
        );
      }),
    [],
  );

  return (
    <Canvas
      className="experience-canvas"
      // Transparent: the DOM beneath supplies the page background and the boot
      // veil, so the canvas never repaints a full-screen background.
      gl={{
        antialias: !isMobile,
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false,
      }}
      dpr={quality.dpr}
      shadows={quality.contactShadow}
      camera={{ fov: 34, near: 0.05, far: 60, position: [0.62, 0.28, 1.65] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.06;
        gl.outputColorSpace = SRGBColorSpace;
        if (quality.contactShadow) gl.shadowMap.type = PCFSoftShadowMap;

        // Exponential fog ties the floor, the motes and the horizon together.
        scene.fog = new THREE.FogExp2('#04060a', 0.06);
        onSceneReady();
      }}
    >
      <Suspense fallback={null}>
        <SceneContents
          quality={quality}
          isMobile={isMobile}
          onConsoleReady={onConsoleReady}
          onControllerReady={onControllerReady}
        />
      </Suspense>

      <CameraRig reducedMotion={reducedMotion} orbitRef={sharedOrbit} />
      <AdaptiveDpr pixelated={false} />
      <Preload all />
    </Canvas>
  );
}

/* -------------------------------------------------------------------------- */
/* Contents                                                                    */
/* -------------------------------------------------------------------------- */

interface SceneContentsProps {
  quality: QualityTier;
  isMobile: boolean;
  onConsoleReady: () => void;
  onControllerReady: () => void;
}

function SceneContents({ quality, isMobile, onConsoleReady, onControllerReady }: SceneContentsProps) {
  return (
    <>
      <StudioEnvironment isMobile={isMobile} />

      <StudioLighting quality={quality} />
      <StudioFloor quality={quality} />
      <Atmosphere quality={quality} />

      {/* Each model is isolated by its own boundary: a failure in one degrades
          that object to the placeholder and leaves the rest of the studio
          running. */}
      <ModelBoundary onFailed={onConsoleReady}>
        <ConsoleModel asset={models.console} onReady={onConsoleReady} />
      </ModelBoundary>

      <ModelBoundary onFailed={onControllerReady}>
        <ControllerModel asset={models.controller} onReady={onControllerReady} />
      </ModelBoundary>

      {/* Engages itself when the hardware chapter owns the viewport. */}
      <InteractiveConsoleStage anchor="hardware" />

      <VoidVeil />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Environment                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A procedural studio built from lightformers rather than a downloaded HDRI.
 *
 * This is what makes the satin shell look photographed: the long soft vertical
 * highlight down the console's white panels comes from the tall key softbox,
 * and the blue separation edge comes from the narrow rim strip behind-right.
 * Baked once (`frames={1}`) because the rig is static — the scroll timeline
 * animates the real lights instead.
 */
function StudioEnvironment({ isMobile }: { isMobile: boolean }) {
  return (
    <Environment resolution={isMobile ? 128 : 256} frames={1}>
      <group rotation={[-Math.PI / 6, 0, 0]}>
        {/* Key softbox, upper left. */}
        <Lightformer
          form="rect"
          intensity={2.4}
          position={[-3.2, 3.4, 2.4]}
          scale={[5, 5, 1]}
          color="#eaf2ff"
        />
        {/* Cold rim strip behind right — the blue edge on the shell. */}
        <Lightformer
          form="rect"
          intensity={4.4}
          position={[3.6, 1.4, -2.8]}
          scale={[0.7, 5.5, 1]}
          color="#1aa8ff"
          rotation={[0, Math.PI, 0]}
        />
        {/* Cool bounce coming back up off the floor. */}
        <Lightformer
          form="rect"
          intensity={0.8}
          position={[0, -2.4, 1.2]}
          scale={[6, 3, 1]}
          color="#13212c"
          rotation={[Math.PI / 2, 0, 0]}
        />
        {/* Narrow kicker that catches the console's top edge. */}
        <Lightformer
          form="rect"
          intensity={2}
          position={[1.4, 3.8, -1.2]}
          scale={[0.4, 4, 1]}
          color="#bfe9ff"
        />
        {/* Dim frontal fill so the shadow side is not solid black. */}
        <Lightformer form="ring" intensity={0.55} position={[0, 1.2, 4]} scale={2.4} color="#0d1a24" />
      </group>
    </Environment>
  );
}

/* -------------------------------------------------------------------------- */
/* Void veil                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A near-black screen-space veil that closes the world down for the finale.
 *
 * Cheaper and more correct than a DOM overlay: the floor, the motes and the
 * hardware all fade with the same value, so the world dissolves as one
 * material rather than being covered by a flat colour.
 */
function VoidVeil() {
  const material = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uAmount: { value: 0 },
      uColor: { value: new THREE.Color('#000000') },
    }),
    [],
  );

  useFrame(() => {
    uniforms.uAmount.value = stage.voidAmount;
  });

  return (
    <VoidBillboard material={material} uniforms={uniforms} />
  );
}

function VoidBillboard({
  material,
  uniforms,
}: {
  material: React.MutableRefObject<THREE.ShaderMaterial | null>;
  uniforms: Record<string, { value: number | THREE.Color }>;
}) {
  const { camera } = useThree();
  const node = useRef<THREE.Mesh>(null);

  // Locked to the camera so the veil always covers the viewport exactly.
  useFrame(() => {
    const mesh = node.current;
    if (!mesh) return;
    mesh.position.copy(camera.position);
    mesh.quaternion.copy(camera.quaternion);
  });

  return (
    <mesh ref={node} renderOrder={999} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms as never}
        transparent
        depthTest={false}
        depthWrite={false}
        vertexShader={/* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            // A 2x2 plane at the near plane is not guaranteed to cover the
            // frustum, so scale in clip space instead.
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform float uAmount;
          uniform vec3 uColor;
          void main() {
            gl_FragColor = vec4(uColor, clamp(uAmount, 0.0, 1.0));
          }
        `}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/* Quality steps                                                               */
/* -------------------------------------------------------------------------- */

const stepDownMid = () => ({
  dpr: [1, 1.5] as [number, number],
  particles: 1200,
  contactShadow: true,
  floorReflectivity: 0.5,
});

const stepDownLow = () => ({
  dpr: [1, 1.1] as [number, number],
  particles: 380,
  contactShadow: false,
  floorReflectivity: 0,
  haze: false,
});
