import * as THREE from 'three';
import { CONFIG } from '../config/gameConfig';
import { addBox, boxGeo, cylGeo, lambert } from '../core/shared';
import type { Rng } from '../core/math';

interface BuildingInstance {
  object: THREE.Object3D;
  size: THREE.Vector3;
  center: THREE.Vector3;
  minY: number;
}

/** Procedural asphalt texture with edge lines and dashed lane lines (one segment tall). */
function makeRoadTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#4a4e57';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#555a64';
    for (let i = 0; i < 160; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 6, 2);
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(8, 0, 6, h);
    ctx.fillRect(w - 14, 0, 6, h);
    const period = h / 5; // 5 dashes per 40 m segment
    ctx.fillStyle = '#ffd23f';
    for (let i = 0; i < 5; i++) ctx.fillRect(w / 2 - 3, i * period + period * 0.15, 6, period * 0.5);
    ctx.fillStyle = '#e8e8e8';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(w * 0.25 - 2, i * period + period * 0.15, 4, period * 0.4);
      ctx.fillRect(w * 0.75 - 2, i * period + period * 0.15, 4, period * 0.4);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

class Segment {
  readonly group = new THREE.Group();
  private readonly buildings: { slot: THREE.Group; models: BuildingInstance[] }[] = [];
  private readonly lamps: THREE.Group[] = [];

  constructor(
    roadMat: THREE.Material,
    private readonly rng: Rng,
  ) {
    const L = CONFIG.road.segmentLength;
    const W = CONFIG.road.width;
    const S = CONFIG.road.sidewalkWidth;

    const road = new THREE.Mesh(new THREE.PlaneGeometry(W, L), roadMat);
    road.rotation.x = -Math.PI / 2;
    this.group.add(road);

    for (const side of [-1, 1]) {
      addBox(this.group, S, 0.25, L, 0xc9c2b2, side * (W / 2 + S / 2), 0.06, 0);
      addBox(this.group, 0.3, 0.32, L, 0xe0dccf, side * (W / 2 + 0.15), 0.1, 0);

      for (let i = 0; i < 3; i++) {
        const slot = new THREE.Group();
        this.group.add(slot);
        this.buildings.push({ slot, models: [] });
      }
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(cylGeo(0.08, 0.1, 5.2, 8), lambert(0x37474f));
      pole.position.y = 2.6;
      const head = new THREE.Mesh(boxGeo(0.7, 0.14, 0.3), lambert(0xfff3b0, 0xfff3b0));
      head.position.set(-side * 0.3, 5.2, 0);
      lamp.add(pole, head);
      lamp.position.set(side * (W / 2 + 0.7), 0.1, 0);
      this.group.add(lamp);
      this.lamps.push(lamp);
    }
    this.randomize();
  }

  setBuildingModels(models: readonly THREE.Object3D[]): void {
    for (const building of this.buildings) {
      building.models = models.map((model) => {
        const bounds = new THREE.Box3().setFromObject(model);
        const instance = model.clone(true);
        instance.visible = false;
        building.slot.add(instance);
        return {
          object: instance,
          size: bounds.getSize(new THREE.Vector3()),
          center: bounds.getCenter(new THREE.Vector3()),
          minY: bounds.min.y,
        };
      });
    }
    this.randomize();
  }

  /** Re-roll the scenery (called when the segment is recycled to the far end). */
  randomize(): void {
    const L = CONFIG.road.segmentLength;
    const W = CONFIG.road.width;
    const S = CONFIG.road.sidewalkWidth;
    this.buildings.forEach((building, idx) => {
      const side = idx < 3 ? -1 : 1;
      const slot = idx % 3;
      const w = 6 + this.rng() * 4;
      const d = 8 + this.rng() * 4;
      const h = 6 + this.rng() * 18;
      const x = side * (W / 2 + S + 0.5 + w / 2 + this.rng() * 1.5);
      const z = -L / 2 + (slot + 0.5) * (L / 3) + (this.rng() - 0.5) * 2;
      building.slot.position.set(x, 0, z);
      const selected = building.models.length > 0
        ? Math.floor(this.rng() * building.models.length) % building.models.length
        : -1;
      building.models.forEach((model, modelIndex) => {
        const instance = model.object;
        instance.visible = modelIndex === selected;
        if (modelIndex !== selected) return;
        instance.scale.set(w / model.size.x, h / model.size.y, d / model.size.z);
        instance.position.set(
          -model.center.x * instance.scale.x,
          -model.minY * instance.scale.y,
          -model.center.z * instance.scale.z,
        );
      });
    });
    for (const lamp of this.lamps) lamp.position.z = (this.rng() - 0.5) * 10;
  }
}

export class Road {
  readonly root = new THREE.Group();
  private readonly segments: Segment[] = [];

  constructor(private readonly rng: Rng = Math.random) {
    const roadMat = new THREE.MeshLambertMaterial({ map: makeRoadTexture() });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 900), lambert(0x8fbf6a));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -300);
    this.root.add(ground);

    for (let i = 0; i < CONFIG.road.segmentCount; i++) {
      const s = new Segment(roadMat, this.rng);
      this.root.add(s.group);
      this.segments.push(s);
    }
    this.reset();
  }

  setBuildingModels(models: readonly THREE.Object3D[]): void {
    if (models.length === 0) throw new Error('At least one building model is required.');
    this.segments.forEach((segment) => segment.setBuildingModels(models));
  }

  reset(): void {
    const L = CONFIG.road.segmentLength;
    this.segments.forEach((s, i) => {
      s.group.position.set(0, 0, L - i * L);
      s.randomize();
    });
  }

  /** Scroll the world towards the camera by `distance` metres. */
  update(distance: number): void {
    const L = CONFIG.road.segmentLength;
    for (const s of this.segments) s.group.position.z += distance;
    for (const s of this.segments) {
      if (s.group.position.z > CONFIG.road.recycleZ) {
        let minZ = Infinity;
        for (const o of this.segments) if (o !== s) minZ = Math.min(minZ, o.group.position.z);
        s.group.position.z = minZ - L;
        s.randomize();
      }
    }
  }
}
