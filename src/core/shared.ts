import * as THREE from 'three';

/**
 * Shared geometry / material caches. Every model is built from a handful of
 * primitives, so reusing them keeps draw-call state and GPU memory small.
 */
const geos = new Map<string, THREE.BufferGeometry>();

function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geos.get(key);
  if (!g) {
    g = make();
    geos.set(key, g);
  }
  return g as T;
}

export const boxGeo = (w: number, h: number, d: number): THREE.BoxGeometry =>
  cached(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));

export const cylGeo = (rTop: number, rBottom: number, h: number, seg = 14): THREE.CylinderGeometry =>
  cached(`c${rTop}|${rBottom}|${h}|${seg}`, () => new THREE.CylinderGeometry(rTop, rBottom, h, seg));

export const sphereGeo = (r: number, seg = 12): THREE.SphereGeometry =>
  cached(`s${r}|${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, seg - 4)));

export const coneGeo = (r: number, h: number, seg = 12): THREE.ConeGeometry =>
  cached(`n${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg));

const mats = new Map<string, THREE.Material>();

export function lambert(color: number, emissive = 0): THREE.MeshLambertMaterial {
  const key = `l${color}|${emissive}`;
  let m = mats.get(key) as THREE.MeshLambertMaterial | undefined;
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, emissive });
    mats.set(key, m);
  }
  return m;
}

export function glow(color: number, opacity: number): THREE.MeshBasicMaterial {
  const key = `g${color}|${opacity}`;
  let m = mats.get(key) as THREE.MeshBasicMaterial | undefined;
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    mats.set(key, m);
  }
  return m;
}

export function addBox(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  color: number,
  x: number,
  y: number,
  z: number,
  emissive = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(boxGeo(w, h, d), lambert(color, emissive));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function addSphere(parent: THREE.Object3D, r: number, color: number, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(sphereGeo(r), lambert(color));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

/** Wheel with its axle along X. Spin it with `pivot.rotation.x`. */
export function addWheel(parent: THREE.Object3D, radius: number, width: number, x: number, y: number, z: number): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const tyre = new THREE.Mesh(cylGeo(radius, radius, width, 14), lambert(0x222222));
  tyre.rotation.z = Math.PI / 2;
  const hub = new THREE.Mesh(cylGeo(radius * 0.5, radius * 0.5, width + 0.02, 10), lambert(0xcfd8dc));
  hub.rotation.z = Math.PI / 2;
  pivot.add(tyre, hub);
  parent.add(pivot);
  return pivot;
}
