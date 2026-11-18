import * as THREE from 'three';
import { CONFIG } from '../config/gameConfig';
import { addBox, addSphere, addWheel, boxGeo } from '../core/shared';
import type { Rng } from '../core/math';
import { VEHICLE_SPECS, type VehicleTypeId } from '../traffic/vehicleSpecs';

/**
 * Greybox / low-poly placeholder models built from primitives.
 * All vehicles face -z with their origin at ground level, centred on their footprint.
 * Swap these for GLB assets later (see docs/REQUIREMENTS.md, Phase E).
 */
export interface BuiltModel {
  group: THREE.Group;
  wheels: THREE.Group[];
  wheelRadius: number;
  sirenLights: { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial; color: number }[];
}

const PALETTE = [0xff5a5f, 0x2ec4b6, 0xffbe0b, 0x3a86ff, 0xff9f1c, 0x8338ec, 0xfb5607, 0x06d6a0];
const pick = (rng: Rng): number => PALETTE[Math.floor(rng() * PALETTE.length) % PALETTE.length];

const RED_GLOW = 0xff2020;

function addHeadlights(g: THREE.Group): void {
  const H = CONFIG.chaser.headlights;
  for (const side of [-1, 1]) {
    const x = side * H.offsetX;
    const bulb = new THREE.Mesh(boxGeo(0.2, 0.12, 0.06), new THREE.MeshBasicMaterial({ color: 0xfff1bd }));
    bulb.position.set(x, H.y, H.z);
    g.add(bulb);

    const spotlight = new THREE.SpotLight(0xffedb5, H.intensity, H.distance, H.angle, 0.6);
    spotlight.position.set(x, H.y, H.z);
    spotlight.target.position.set(x, H.y - 0.15, H.z - H.distance);
    g.add(spotlight, spotlight.target);
  }
}

function addSirenLights(g: THREE.Group): { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial; color: number }[] {
  const lights = [
    { x: -0.3, color: 0xff2020 },
    { x: 0.3, color: 0x206bff },
  ].map(({ x, color }) => {
    const material = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(boxGeo(0.5, 0.1, 0.15), material);
    mesh.position.set(x, CONFIG.chaser.sirenY, -0.4);
    g.add(mesh);
    return { mesh, material, color };
  });
  return lights;
}

function fitModel(source: THREE.Object3D, width: number, height: number, length: number): THREE.Group {
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const instance = source.clone(true);
  instance.scale.set(width / size.x, height / size.y, length / size.z);
  instance.position.set(
    -center.x * instance.scale.x,
    -bounds.min.y * instance.scale.y,
    -center.z * instance.scale.z,
  );
  const group = new THREE.Group();
  group.add(instance);
  return group;
}

/** Red under-glow marks a vehicle as lethal. */
function dangerGlow(g: THREE.Group, w: number, l: number): void {
  addBox(g, w, 0.06, l, RED_GLOW, 0, 0.08, 0, RED_GLOW);
}

export interface RickshawStyle {
  body: number;
  canopy: number;
  accent: number;
  /** Roof light bar (chaser). */
  lightBar?: boolean;
}

/** Bangladeshi-style battery auto-rickshaw: nose, driver, rear seat, canopy, 3 wheels. */
export function makeRickshaw(style: RickshawStyle, model?: THREE.Object3D): BuiltModel {
  const sirenLights: BuiltModel['sirenLights'] = [];
  if (model) {
    const g = fitModel(model, CONFIG.player.halfW * 2, CONFIG.player.modelHeight, CONFIG.player.halfL * 2);
    if (style.lightBar) {
      addHeadlights(g);
      sirenLights.push(...addSirenLights(g));
    }
    return { group: g, wheels: [], wheelRadius: 1, sirenLights };
  }

  const g = new THREE.Group();
  const wheels: THREE.Group[] = [];

  addBox(g, 1.3, 0.5, 2.3, style.body, 0, 0.62, 0.15);
  addBox(g, 1.32, 0.08, 2.32, style.accent, 0, 0.88, 0.15);
  addBox(g, 0.9, 0.75, 0.8, style.body, 0, 0.72, -1.2);
  addBox(g, 1.1, 0.4, 0.7, 0x3d2b1f, 0, 1.0, 0.75);
  for (const px of [-0.62, 0.62]) {
    addBox(g, 0.07, 1.05, 0.07, 0x37474f, px, 1.4, -0.5);
    addBox(g, 0.07, 1.05, 0.07, 0x37474f, px, 1.4, 1.15);
  }
  addBox(g, 1.5, 0.12, 1.95, style.canopy, 0, 1.95, 0.32);
  addBox(g, 1.0, 0.55, 0.04, 0xbfe9ff, 0, 1.45, -0.55);
  addBox(g, 0.7, 0.06, 0.06, 0x222222, 0, 1.15, -0.9);
  addBox(g, 0.06, 0.5, 0.06, 0x222222, 0, 0.9, -0.95);
  if (style.lightBar) addHeadlights(g);
  addBox(g, 0.4, 0.5, 0.3, 0xf4f4f4, 0, 1.15, -0.1);
  addSphere(g, 0.2, 0xe0ac69, 0, 1.55, -0.1);
  if (style.lightBar) sirenLights.push(...addSirenLights(g));

  wheels.push(addWheel(g, 0.32, 0.18, 0, 0.32, -1.2));
  wheels.push(addWheel(g, 0.32, 0.2, -0.72, 0.32, 0.8));
  wheels.push(addWheel(g, 0.32, 0.2, 0.72, 0.32, 0.8));
  return { group: g, wheels, wheelRadius: 0.32, sirenLights };
}

function makeMotorbike(rng: Rng): BuiltModel {
  const g = new THREE.Group();
  const c = pick(rng);
  addBox(g, 0.3, 0.45, 1.3, c, 0, 0.65, 0);
  addBox(g, 0.34, 0.25, 0.5, 0x263238, 0, 0.95, -0.15);
  addBox(g, 0.3, 0.12, 0.6, 0x111111, 0, 0.95, 0.3);
  addBox(g, 0.7, 0.06, 0.06, 0x333333, 0, 1.1, -0.55);
  addBox(g, 0.08, 0.6, 0.08, 0x333333, 0, 0.75, -0.6);
  addBox(g, 0.4, 0.6, 0.3, pick(rng), 0, 1.25, 0.15);
  addSphere(g, 0.2, pick(rng), 0, 1.7, 0.1);
  const wheels = [addWheel(g, 0.35, 0.12, 0, 0.35, -0.62), addWheel(g, 0.35, 0.12, 0, 0.35, 0.62)];
  return { group: g, wheels, wheelRadius: 0.35, sirenLights: [] };
}

function makeHandcart(rng: Rng): BuiltModel {
  const g = new THREE.Group();
  addBox(g, 1.7, 0.15, 2.4, 0x8d6e63, 0, 0.7, 0);
  addBox(g, 1.2, 0.7, 1.0, pick(rng), -0.15, 1.15, 0.2);
  addBox(g, 0.8, 0.5, 0.8, pick(rng), 0.3, 1.0, -0.6);
  addBox(g, 0.5, 0.4, 0.5, pick(rng), -0.4, 1.7, 0.2);
  addBox(g, 0.06, 0.06, 1.1, 0x5d4037, 0, 0.75, -1.75);
  const wheels = [addWheel(g, 0.4, 0.12, -0.9, 0.4, 0.3), addWheel(g, 0.4, 0.12, 0.9, 0.4, 0.3)];
  return { group: g, wheels, wheelRadius: 0.4, sirenLights: [] };
}

function makeCar(rng: Rng): BuiltModel {
  const g = new THREE.Group();
  const c = pick(rng);
  addBox(g, 1.9, 0.65, 4.2, c, 0, 0.7, 0);
  addBox(g, 1.6, 0.6, 2.2, 0xbfe9ff, 0, 1.3, 0.2);
  addBox(g, 1.62, 0.1, 2.0, c, 0, 1.65, 0.2);
  addBox(g, 0.4, 0.2, 0.08, 0xd32f2f, -0.6, 0.75, 2.1, 0x7f0000);
  addBox(g, 0.4, 0.2, 0.08, 0xd32f2f, 0.6, 0.75, 2.1, 0x7f0000);
  dangerGlow(g, 1.8, 3.8);
  const wheels = [
    addWheel(g, 0.38, 0.25, -0.95, 0.38, -1.3),
    addWheel(g, 0.38, 0.25, 0.95, 0.38, -1.3),
    addWheel(g, 0.38, 0.25, -0.95, 0.38, 1.3),
    addWheel(g, 0.38, 0.25, 0.95, 0.38, 1.3),
  ];
  return { group: g, wheels, wheelRadius: 0.38, sirenLights: [] };
}

function makeBus(rng: Rng): BuiltModel {
  const g = new THREE.Group();
  const c = pick(rng);
  addBox(g, 2.9, 2.5, 9.5, c, 0, 1.7, 0);
  addBox(g, 2.94, 0.8, 8.6, 0x1d2a38, 0, 2.3, 0);
  addBox(g, 2.92, 0.3, 9.52, 0xffffff, 0, 1.2, 0);
  addBox(g, 2.7, 0.15, 9.2, 0xeeeeee, 0, 3.0, 0);
  addBox(g, 2.4, 0.9, 0.05, 0x1d2a38, 0, 2.2, -4.77);
  dangerGlow(g, 2.7, 9.0);
  const wheels = [
    addWheel(g, 0.55, 0.35, -1.5, 0.55, -3.0),
    addWheel(g, 0.55, 0.35, 1.5, 0.55, -3.0),
    addWheel(g, 0.55, 0.35, -1.5, 0.55, 3.0),
    addWheel(g, 0.55, 0.35, 1.5, 0.55, 3.0),
  ];
  return { group: g, wheels, wheelRadius: 0.55, sirenLights: [] };
}

function makeTruck(rng: Rng): BuiltModel {
  const g = new THREE.Group();
  const c = pick(rng);
  addBox(g, 2.6, 2.0, 2.2, c, 0, 1.6, -2.8);
  addBox(g, 2.2, 0.7, 0.05, 0x1d2a38, 0, 2.1, -3.92);
  addBox(g, 2.8, 2.4, 5.2, 0xb0bec5, 0, 2.0, 1.1);
  addBox(g, 2.82, 0.2, 5.22, 0x607d8b, 0, 0.85, 1.1);
  dangerGlow(g, 2.6, 7.2);
  const wheels = [
    addWheel(g, 0.5, 0.35, -1.45, 0.5, -2.8),
    addWheel(g, 0.5, 0.35, 1.45, 0.5, -2.8),
    addWheel(g, 0.5, 0.35, -1.45, 0.5, 1.6),
    addWheel(g, 0.5, 0.35, 1.45, 0.5, 1.6),
    addWheel(g, 0.5, 0.35, -1.45, 0.5, 2.8),
    addWheel(g, 0.5, 0.35, 1.45, 0.5, 2.8),
  ];
  return { group: g, wheels, wheelRadius: 0.5, sirenLights: [] };
}

export function buildVehicle(id: VehicleTypeId, rng: Rng = Math.random, model?: THREE.Object3D): BuiltModel {
  if (model) {
    const spec = VEHICLE_SPECS[id];
    const group = fitModel(model, spec.halfW * 2, spec.height, spec.halfL * 2);
    if (spec.kind === 'heavy') dangerGlow(group, spec.halfW * 2, spec.halfL * 2);
    return { group, wheels: [], wheelRadius: 1, sirenLights: [] };
  }

  switch (id) {
    case 'motorbike':
      return makeMotorbike(rng);
    case 'handcart':
      return makeHandcart(rng);
    case 'car':
      return makeCar(rng);
    case 'bus':
      return makeBus(rng);
    case 'truck':
      return makeTruck(rng);
  }
}
