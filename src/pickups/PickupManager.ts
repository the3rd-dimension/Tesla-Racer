import * as THREE from 'three';
import { CONFIG } from '../config/gameConfig';
import { addBox, coneGeo, cylGeo, glow, lambert } from '../core/shared';
import { Pool } from '../core/Pool';
import { randRange, type Rng } from '../core/math';
import { overlaps, type Footprint } from '../systems/Collision';

export type PickupType = 'boost' | 'jump';

export class Pickup implements Footprint {
  x = 0;
  z = 0;
  readonly halfW = CONFIG.pickups.halfW;
  readonly halfL = CONFIG.pickups.halfL;
  phase = 0;

  constructor(
    readonly type: PickupType,
    readonly group: THREE.Group,
  ) {}
}

function buildBoost(): THREE.Group {
  const g = new THREE.Group();
  const body = addBox(g, 0.5, 0.7, 0.3, 0x2ee6a6, 0, 0, 0, 0x0a8f66);
  body.name = 'body';
  addBox(g, 0.2, 0.1, 0.12, 0xffffff, 0, 0.4, 0);
  const bolt = addBox(g, 0.12, 0.42, 0.34, 0xffe14d, 0, 0, 0, 0xcc9900);
  bolt.rotation.z = 0.45;
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 8), glow(0x2ee6a6, 0.22)));
  return g;
}

function buildJump(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(cylGeo(0.3, 0.3, 0.1, 12), lambert(i % 2 ? 0x9be564 : 0x4cc9f0, 0x113311));
    ring.position.y = -0.3 + i * 0.16;
    g.add(ring);
  }
  const arrow = new THREE.Mesh(coneGeo(0.26, 0.4), lambert(0xffd23f, 0x996600));
  arrow.position.y = 0.38;
  g.add(arrow);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 8), glow(0x9be564, 0.22)));
  return g;
}

export class PickupManager {
  readonly active: Pickup[] = [];
  private readonly pools: Record<PickupType, Pool<Pickup>>;
  private approach = 0;
  private nextInterval: number;
  /** Vehicles a new pickup must not spawn on top of. */
  blockers: () => readonly Footprint[] = () => [];

  constructor(
    private readonly parent: THREE.Object3D,
    private readonly rng: Rng = Math.random,
  ) {
    this.pools = {
      boost: new Pool(() => new Pickup('boost', buildBoost())),
      jump: new Pool(() => new Pickup('jump', buildJump())),
    };
    this.nextInterval = randRange(rng, CONFIG.pickups.intervalMin, CONFIG.pickups.intervalMax);
  }

  reset(): void {
    for (let i = this.active.length - 1; i >= 0; i--) this.release(this.active[i], i);
    this.approach = 0;
    this.nextInterval = randRange(this.rng, CONFIG.pickups.intervalMin, CONFIG.pickups.intervalMax);
  }

  /** Pickups drift with the traffic flow so they can never slide into a vehicle. */
  update(dt: number, relSpeed: number, allowSpawn: boolean, time: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.z += relSpeed * dt;
      p.group.position.set(p.x, CONFIG.pickups.hoverHeight + Math.sin(time * 3 + p.phase) * 0.12, p.z);
      p.group.rotation.y += 2.4 * dt;
      if (p.z > CONFIG.traffic.despawnZ) this.release(p, i);
    }

    if (!allowSpawn) return;
    this.approach += relSpeed * dt;
    if (this.approach >= this.nextInterval) this.trySpawn();
  }

  collect(p: Pickup): void {
    const i = this.active.indexOf(p);
    if (i >= 0) this.release(p, i);
  }

  private trySpawn(): void {
    const slots = [...CONFIG.pickups.slotXs];
    // Fisher-Yates so the lane choice is unbiased.
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    const z = -CONFIG.traffic.spawnDistance;
    const blockers = this.blockers();
    for (const x of slots) {
      const fp: Footprint = { x, z, halfW: CONFIG.pickups.halfW, halfL: CONFIG.pickups.halfL };
      let free = true;
      for (const o of blockers) {
        if (overlaps(fp, o, 1, CONFIG.pickups.clearMargin)) {
          free = false;
          break;
        }
      }
      if (!free) continue;
      const type: PickupType =
        this.rng() * (CONFIG.pickups.boostWeight + CONFIG.pickups.jumpWeight) < CONFIG.pickups.boostWeight ? 'boost' : 'jump';
      const p = this.pools[type].acquire();
      p.x = x;
      p.z = z;
      p.phase = this.rng() * Math.PI * 2;
      p.group.position.set(x, CONFIG.pickups.hoverHeight, z);
      this.parent.add(p.group);
      this.active.push(p);
      this.approach = 0;
      this.nextInterval = randRange(this.rng, CONFIG.pickups.intervalMin, CONFIG.pickups.intervalMax);
      return;
    }
  }

  private release(p: Pickup, index: number): void {
    this.active.splice(index, 1);
    this.parent.remove(p.group);
    this.pools[p.type].release(p);
  }
}

