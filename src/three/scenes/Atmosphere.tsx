import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { stage } from '@/state/stage';
import { clamp } from '@/state/stage';
import type { QualityTier } from '@/utils/performance';
import { mulberry32 } from '@/utils/random';

/**
 * Atmosphere.
 *
 * Three cheap layers that together read as a lit volume rather than as empty
 * space:
 *   - drifting motes, sized in device pixels so they never bloat
 *   - a wide horizon gradient that separates floor from void
 *   - a soft ground-hugging haze that the hardware sits inside
 *
 * Deliberately restrained. No neon blobs, no glow orbs — the only saturated
 * colour in the frame is the blue the timeline asks for.
 */
export function Atmosphere({ quality }: { quality: QualityTier }) {
  return (
    <>
      <HorizonGradient />
      {quality.haze ? <GroundHaze /> : null}
      <ParticleField quality={quality} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Horizon                                                                     */
/* -------------------------------------------------------------------------- */

function HorizonGradient() {
  const material = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color('#020306') },
      uHorizon: { value: new THREE.Color('#0a141d') },
      uBottom: { value: new THREE.Color('#010203') },
      uAccent: { value: new THREE.Color('#0b3a52') },
      uAccentAmount: { value: 0.35 },
    }),
    [],
  );

  useFrame(() => {
    if (!material.current) return;
    material.current.uniforms.uAccentAmount.value = clamp(
      0.18 + stage.rimIntensity * 0.14 - stage.voidAmount * 0.2,
    );
  });

  return (
    <mesh scale={[-1, 1, 1]} position={[0, 0, -18]} renderOrder={-100}>
      <planeGeometry args={[46, 26]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
        vertexShader={/* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform vec3 uBottom;
          uniform vec3 uAccent;
          uniform float uAccentAmount;
          varying vec2 vUv;

          void main() {
            // Tight band right at the horizon, falling off fast either side.
            float band = exp(-pow((vUv.y - 0.42) * 7.0, 2.0));
            float deep = smoothstep(0.42, 1.0, vUv.y);
            float floorFade = smoothstep(0.0, 0.34, vUv.y);

            vec3 color = mix(uBottom, uHorizon, floorFade);
            color = mix(color, uTop, deep);
            color += uAccent * band * uAccentAmount;

            // Vignette the edges so the plane's boundary is never visible.
            float edge = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
            gl_FragColor = vec4(color, edge);
          }
        `}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/* Ground haze                                                                 */
/* -------------------------------------------------------------------------- */

function GroundHaze() {
  const ref = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#1d5f82') },
      uStrength: { value: 0.1 },
    }),
    [],
  );

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;
    uniforms.uStrength.value = clamp(0.05 + stage.rimIntensity * 0.035) * (1 - stage.voidAmount);
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} renderOrder={-50}>
      <planeGeometry args={[14, 14]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={/* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uStrength;
          varying vec2 vUv;

          // Cheap value noise — enough to break the perfect circle.
          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }
          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
              f.y
            );
          }

          void main() {
            vec2 centered = (vUv - 0.5) * 2.0;
            float radius = length(centered);

            // Radial falloff keeps the haze centred on the hardware.
            float falloff = 1.0 - smoothstep(0.1, 1.0, radius);

            float drift = noise(vUv * 3.2 + vec2(uTime * 0.03, uTime * -0.02));
            drift = mix(0.75, 1.25, drift);

            float alpha = falloff * falloff * drift * uStrength;
            gl_FragColor = vec4(uColor, alpha);
          }
        `}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/* Particles                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Drifting motes.
 *
 * One `Points` draw call. Positions are baked once and animated in the vertex
 * shader from a single time uniform, so the CPU cost per frame is a single
 * uniform write regardless of count.
 */
export function ParticleField({ quality }: { quality: QualityTier }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const points = useRef<THREE.Points>(null);

  const count = quality.particles;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const scales = new Float32Array(count);

    // Seeded rather than `Math.random()`. A memoised value has to be a pure
    // function of its inputs: if React discards and recomputes the memo (which
    // it is free to do), an unseeded version would silently relocate every
    // mote in the scene. A fixed seed also means the field is identical on every
    // visit, which reads as a designed composition rather than noise, and it
    // keeps StrictMode's double-invocation from producing two different fields.
    const random = mulberry32(0x5eed);

    for (let i = 0; i < count; i += 1) {
      // Bias the distribution toward the volume around the hardware rather
      // than filling the whole frustum with dust.
      const radius = 1.1 + Math.pow(random(), 0.6) * 3.4;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = (random() - 0.35) * 2.4;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      seeds[i] = random() * 100;
      scales[i] = 0.4 + random() * random() * 2.2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 8);

    return geo;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color('#bfe6ff') },
      uAccent: { value: new THREE.Color('#0ec8ff') },
      uPointer: { value: new THREE.Vector2() },
      uPixelRatio: { value: 1 },
    }),
    [],
  );

  useFrame((state, delta) => {
    uniforms.uTime.value += delta;
    uniforms.uOpacity.value = stage.particleOpacity;
    uniforms.uPointer.value.set(stage.pointerX, stage.pointerY);
    uniforms.uPixelRatio.value = state.viewport.dpr;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={/* glsl */ `
          attribute float aSeed;
          attribute float aScale;
          uniform float uTime;
          uniform float uPixelRatio;
          uniform vec2 uPointer;
          varying float vAlpha;
          varying float vAccentMix;

          void main() {
            vec3 pos = position;

            // Slow vertical drift, wrapped so the field never empties.
            float drift = mod(uTime * 0.028 + aSeed * 0.37, 2.4) - 1.2;
            pos.y += drift;
            pos.x += sin(uTime * 0.14 + aSeed) * 0.05;
            pos.z += cos(uTime * 0.11 + aSeed * 1.3) * 0.05;

            // Pointer pushes the field gently aside — parallax without particles
            // ever becoming the interaction.
            pos.x += uPointer.x * 0.09 * smoothstep(2.6, 0.4, length(pos));
            pos.z += uPointer.y * 0.06;

            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mv;

            // Size in device pixels, so motes stay small and crisp.
            gl_PointSize = aScale * uPixelRatio * (14.0 / -mv.z);
            gl_PointSize = clamp(gl_PointSize, 0.6, 5.5);

            // Fade with distance and with height, and fade in/out at the ends
            // of the drift cycle so wrapping is invisible.
            float distanceFade = smoothstep(7.5, 1.2, -mv.z);
            float cycleFade = smoothstep(0.0, 0.35, 1.2 - abs(drift));
            vAlpha = distanceFade * cycleFade;
            vAccentMix = fract(aSeed * 0.618);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform float uOpacity;
          uniform vec3 uColor;
          uniform vec3 uAccent;
          varying float vAlpha;
          varying float vAccentMix;

          void main() {
            // Soft round falloff; a hard square dot would look like dust on
            // the lens rather than suspended matter.
            vec2 uv = gl_PointCoord - 0.5;
            float d = length(uv);
            if (d > 0.5) discard;

            float core = 1.0 - smoothstep(0.0, 0.5, d);
            core = pow(core, 2.2);

            vec3 color = mix(uColor, uAccent, vAccentMix * 0.75);
            float alpha = core * vAlpha * uOpacity * 0.5;

            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </points>
  );
}
