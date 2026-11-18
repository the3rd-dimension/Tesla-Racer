import * as THREE from 'three';
import { CONFIG } from '../config/gameConfig';
import { Pool } from '../core/Pool';
import { pickWeighted, type Rng } from '../core/math';
import { overlaps, type Footprint } from '../systems/Collision';
import { spawnGapMeters } from '../systems/Difficulty';
import { buildVehicle } from '../vehicles/models';
import { patternBounds, PATTERNS, type TrafficPattern } from './patterns';
import { VEHICLE_SPECS, type VehicleSpec, type VehicleTypeId } from './vehicleSpecs';

export class Vehicle implements Footprint {
  x = 0;
  z = 0;
  y = 0;
  hit = false;
  knocked = false;
  knockT = 0;
  knockVx = 0;
  knockSpin = 0;

  constructor(
    readonly spec: VehicleSpec,
    readonly group: THREE.Group,
    readonly wheels: THREE.Group[],
    readonly wheelRadius: number,
  ) {}

  get halfW(): number {
    return this.spec.halfW;
  }
  get halfL(): number {
    return this.spec.halfL;
  }

  /** Cosmetic crash reaction for light vehicles. */
  knock(dirX: number): void {
    this.knocked = true;
    this.knockT = 0;
    this.knockVx = dirX * CONFIG.collision.light.knockSpeed;
    this.knockSpin = dirX * CONFIG.collision.light.knockSpin;
  }
}

export class TrafficManager {
  readonly active: Vehicle[] = [];
  private vehicleModels: Partial<Record<VehicleTypeId, readonly THREE.Object3D[]>> = {};
  private readonly pools = new Map<VehicleTypeId, Pool<Vehicle>>();
  private approach = 0;
  private prevFar = 0;
  private pending: TrafficPattern | null = null;
  private firstSpawn = true;
  /** Other objects (pickups) a new pattern must not spawn on top of. */
  extraBlockers: () => readonly Footprint[] = () => [];

  constructor(
    private readonly parent: THREE.Object3D,
    private readonly rng: Rng = Math.random,
  ) {}

  setVehicleModels(models: Partial<Record<VehicleTypeId, readonly THREE.Object3D[]>>): void {
    this.vehicleModels = models;
  }

  reset(): void {
    for (let i = this.active.length - 1; i >= 0; i--) this.release(this.active[i], i);
    this.approach = 0;
    this.prevFar = 0;
    this.pending = null;
    this.firstSpawn = true;
  }

  /**
   * @param relSpeed  how fast traffic approaches the player (player speed - traffic speed)
   * @param ownSpeed  traffic's own forward speed (wheel spin)
   */
  update(dt: number, relSpeed: number, ownSpeed: number, d: number, allowSpawn: boolean): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const v = this.active[i];
      v.z += relSpeed * dt;
      if (v.knocked) {
        v.knockT += dt;
        v.x += v.knockVx * dt;
        v.group.rotation.y += v.knockSpin * dt;
        const u = Math.min(1, v.knockT / 0.6);
        v.y = Math.sin(u * Math.PI) * 1.2;
      } else {
        const spin = (ownSpeed * dt) / v.wheelRadius;
        for (const w of v.wheels) w.rotation.x -= spin;
      }
      v.group.position.set(v.x, v.y, v.z);

      const expired = v.knocked && v.knockT > CONFIG.collision.light.knockSeconds;
      if (v.z > CONFIG.traffic.despawnZ || expired || Math.abs(v.x) > 40) this.release(v, i);
    }

    if (allowSpawn) {
      this.approach += relSpeed * dt;
      this.trySpawn(d, relSpeed);
    }
  }

  /** True if a footprint (+margin) does not overlap any active vehicle. */
  isAreaFree(fp: Footprint, margin: number): boolean {
    for (const v of this.active) if (overlaps(fp, v, 1, margin)) return false;
    return true;
  }

  private trySpawn(d: number, relSpeed: number): void {
    if (this.active.length >= CONFIG.traffic.maxActive - 4) return;

    if (!this.pending) this.pending = this.pickPattern(d);
    const pattern = this.pending;
    const b = patternBounds(pattern);

    let z0 = -CONFIG.traffic.spawnDistance;
    if (this.firstSpawn) {
      z0 = -CONFIG.traffic.firstSpawnDistance;
    } else {
      const needed = this.prevFar + b.near + spawnGapMeters(d, relSpeed);
      if (this.approach < needed) return;
    }

    const flip = this.rng() < 0.5 ? -1 : 1;
    const blockers = this.extraBlockers();
    const footprints: Footprint[] = pattern.entries.map((e) => {
      const s = VEHICLE_SPECS[e.type];
      return { x: e.x * flip, z: z0 - e.dz, halfW: s.halfW, halfL: s.halfL };
    });
    for (const fp of footprints) {
      if (!this.isAreaFree(fp, CONFIG.traffic.spawnMargin)) return;
      for (const o of blockers) if (overlaps(fp, o, 1, CONFIG.traffic.spawnMargin)) return;
    }

    pattern.entries.forEach((e, i) => {
      const v = this.acquire(e.type);
      v.x = footprints[i].x;
      v.z = footprints[i].z;
      v.group.position.set(v.x, 0, v.z);
      this.parent.add(v.group);
      this.active.push(v);
    });

    this.firstSpawn = false;
    this.approach = 0;
    this.prevFar = b.far;
    this.pending = null;
  }

  private pickPattern(d: number): TrafficPattern {
    const eligible = PATTERNS.filter((p) => p.minDifficulty <= d);
    // Bias towards newly unlocked patterns slightly so progress is felt.
    return pickWeighted(eligible.length ? eligible : PATTERNS.slice(0, 1), this.rng);
  }

  private acquire(type: VehicleTypeId): Vehicle {
    let pool = this.pools.get(type);
    if (!pool) {
      pool = new Pool<Vehicle>(
        () => {
          const variants = this.vehicleModels[type];
          const model = variants?.length
            ? variants[Math.floor(this.rng() * variants.length) % variants.length]
            : undefined;
          const built = buildVehicle(type, this.rng, model);
          return new Vehicle(VEHICLE_SPECS[type], built.group, built.wheels, built.wheelRadius);
        },
        (v) => {
          v.hit = false;
          v.knocked = false;
          v.knockT = 0;
          v.y = 0;
          v.group.rotation.set(0, 0, 0);
          for (const w of v.wheels) w.rotation.x = 0;
        },
      );
      this.pools.set(type, pool);
    }
    return pool.acquire();
  }

  private release(v: Vehicle, index: number): void {
    this.active.splice(index, 1);
    this.parent.remove(v.group);
    this.pools.get(v.spec.id)?.release(v);
  }
}
