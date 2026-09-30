import * as THREE from 'three';
import type { ModelAsset } from '@/types';

/**
 * Material factory.
 *
 * The supplied FBX meshes arrive with placeholder Phong-ish materials and no
 * texture bindings (Blender's FBX exporter writes flat `Kd 0.8` and only
 * references the maps by filename). This module rebuilds them as proper
 * physical materials, using the real-world PBR sets that ship alongside each
 * model, and hand-tunes the parts that have no maps of their own.
 */

/** Cool blue used for the hardware's light bars and rim work. */
export const ACCENT = new THREE.Color('#0ec8ff');
/** A colder, near-white blue for the key-side highlight. */
export const ACCENT_COOL = new THREE.Color('#8fd8ff');

export interface MaterialKit {
  dispose: () => void;
}

/* -------------------------------------------------------------------------- */
/* Texture setup                                                               */
/* -------------------------------------------------------------------------- */

export function configureMaps(kit: Record<string, THREE.Texture | null>) {
  for (const texture of Object.values(kit)) {
    if (!texture) continue;
    // PBR maps tile across the shell panels; the maps are square and the
    // console's UVs are laid out per-panel.
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    texture.colorSpace = THREE.NoColorSpace;
    texture.needsUpdate = true;
  }

  if (kit.color) kit.color.colorSpace = THREE.SRGBColorSpace;
}

/* -------------------------------------------------------------------------- */
/* Body material                                                               */
/* -------------------------------------------------------------------------- */

export function createBodyMaterial(kit: Record<string, THREE.Texture | null>) {
  const material = new THREE.MeshPhysicalMaterial({
    map: kit.color ?? null,
    normalMap: kit.normal ?? null,
    roughnessMap: kit.roughness ?? null,
    metalnessMap: kit.metalness ?? null,
    // Painted satin shell: mostly dielectric with a faint clear-coat sheen.
    metalness: 1,
    roughness: 1,
    clearcoat: 0.34,
    clearcoatRoughness: 0.42,
    envMapIntensity: 1.15,
    sheen: 0.06,
    sheenColor: new THREE.Color('#2b3a4a'),
  });

  if (kit.normal) {
    material.normalScale = new THREE.Vector2(0.85, 0.85);
  }

  return material;
}

/* -------------------------------------------------------------------------- */
/* Light-bar material                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The PS5's light strips. Physically these are diffuse plastic with an
 * internal LED, so: dark base, strong emissive, and a clear coat that catches
 * the environment. `emissive` is animated per-frame by the light rig.
 */
export function createLedMaterial(tint: THREE.Color = ACCENT) {
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#0a0c10'),
    metalness: 0.1,
    roughness: 0.24,
    emissive: tint.clone(),
    emissiveIntensity: 1.2,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.6,
    toneMapped: true,
  });

  return material;
}

/* -------------------------------------------------------------------------- */
/* Trim material                                                               */
/* -------------------------------------------------------------------------- */

/** Near-black rubber/plastic: buttons, silhouettes, dark inserts. */
export function createTrimMaterial(tint = '#141519') {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tint),
    metalness: 0.32,
    roughness: 0.52,
    clearcoat: 0.18,
    clearcoatRoughness: 0.6,
    envMapIntensity: 0.75,
  });
}

/**
 * The shape button on the controller. The real one is a glossy near-white
 * disc that reads as a tiny light source in dark scenes, so it gets a soft
 * emissive lift plus a high clearcoat.
 */
export function createButtonMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#eef2f6'),
    metalness: 0.15,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    emissive: new THREE.Color('#16323f'),
    emissiveIntensity: 0.55,
    envMapIntensity: 1.9,
  });
}

/* -------------------------------------------------------------------------- */
/* Material routing                                                            */
/* -------------------------------------------------------------------------- */

const normalise = (name: string) => name.toLowerCase().replace(/[\s_.-]/g, '');

/**
 * Assigns the right material to every mesh in a loaded FBX.
 *
 * Returns the LED materials so the light rig can pulse their emissive strength
 * on the scroll timeline.
 */
export function applyModelMaterials(
  root: THREE.Object3D,
  asset: ModelAsset,
  kit: Record<string, THREE.Texture | null>,
) {
  const textured = new Set(asset.texturedMaterials.map(normalise));
  const emissive = new Set(asset.emissiveMaterials.map(normalise));
  const trim = new Set(asset.trimMaterials.map(normalise));

  const body = createBodyMaterial(kit);
  const led = createLedMaterial(ACCENT);
  const ledSecondary = createLedMaterial(ACCENT_COOL);
  const trimMaterial = createTrimMaterial();
  const button = createButtonMaterial();

  const created = [body, led, ledSecondary, trimMaterial, button];
  const assignedLed: THREE.MeshPhysicalMaterial[] = [];

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;

    const sourceNames = Array.isArray(mesh.material)
      ? mesh.material.map((m) => m?.name ?? '')
      : [mesh.material?.name ?? ''];

    // FBX importer suffixes duplicates, e.g. "PS5_LED_Frame.001"
    const primary = normalise(sourceNames[0] ?? '');
    const matches = (list: Set<string>) =>
      sourceNames.some((name) => {
        const key = normalise(name);
        return [...list].some((entry) => key === entry || key.startsWith(entry));
      });

    let material: THREE.Material;

    if (matches(emissive)) {
      // Distribute the two LED tints so the strips read as more than one lamp.
      material = assignedLed.length % 2 === 0 ? led : ledSecondary;
      assignedLed.push(material as THREE.MeshPhysicalMaterial);
    } else if (primary.includes('arrow')) {
      // The shape button is the only genuinely glossy white part, and it is
      // listed under trim as well — so it has to be tested before the trim
      // branch. Testing "button" here instead would also swallow
      // "Button_Silhouete", which is the matte black button bed and must stay
      // dark or the controller reads as a field of white dots.
      material = button;
    } else if (matches(trim)) {
      material = trimMaterial;
    } else if (matches(textured) || sourceNames.length === 0) {
      material = body;
    } else {
      // Unknown part: satin neutral that will not fight the body.
      material = trimMaterial;
    }

    mesh.material = material;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = mesh.name || `${asset.id}-part`;
  });

  return {
    ledMaterials: assignedLed.length ? assignedLed : [led],
    dispose: () => {
      for (const material of created) material.dispose();
    },
  };
}
