import * as THREE from 'three';
import { CONFIG } from '../config/gameConfig';
import { clamp, damp, lerp, smoothstep01 } from '../core/math';
import type { InputSnapshot } from '../input/InputManager';
import type { Footprint } from '../systems/Collision';
import { makeRickshaw } from '../vehicles/models';

export interface PlayerEvents {
  onBoostStart?: () => void;
  onBoostEnd?: () => void;
  onJump?: () => void;
  onLand?: () => void;
}

export class Player implements Footprint {
  readonly group = new THREE.Group();
  readonly halfW = CONFIG.player.halfW;
  readonly halfL = CONFIG.player.halfL;
  readonly z = 0;
  events: PlayerEvents = {};

  x = 0;
  y = 0;
  vx = 0;
  /** Current forward speed in m/s (cruise x boost x slow). */
  speed = 0;
  boostCharge: number = CONFIG.boost.startCharge;
  boosting = false;
  /** Seconds the Jump pickup remains usable (0 = none). */
  jumpReady = 0;

  private airTime = -1;
  private boostFactor = 1;
  private boostCapacity: number = CONFIG.boost.max;
  private boostMultiplier: number = CONFIG.boost.multiplier;
  private boostStartCharge: number = CONFIG.boost.startCharge;
  private boostLocked = false;
  private slowRemaining = 0;
  private slowDuration = 1;
  private slowStart = 1;
  private bobTime = 0;
  private floatTime = 0;
  private floatingSkin = false;
  private crashTilt = 0;
  private wheels: THREE.Group[];
  private wheelRadius: number;

  constructor() {
    const m = makeRickshaw({ body: 0x2ec4b6, canopy: 0xffc83d, accent: 0xffffff });
    this.group.add(m.group);
    this.wheels = m.wheels;
    this.wheelRadius = m.wheelRadius;
  }

  setModel(model: THREE.Object3D | undefined): void {
    const built = makeRickshaw(
      { body: 0x2ec4b6, canopy: 0xffc83d, accent: 0xffffff },
      model,
    );
    this.group.clear();
    this.group.add(built.group);
    this.wheels = built.wheels;
    this.wheelRadius = built.wheelRadius;
  }

  setFloatingSkin(enabled: boolean): void {
    if (this.floatingSkin === enabled) return;
    this.floatingSkin = enabled;
    this.floatTime = 0;
  }

  setBoostUpgrade(level: number): void {
    const upgrade = CONFIG.store.upgrades.boost;
    this.boostCapacity = CONFIG.boost.max + level * upgrade.chargePerLevel;
    this.boostMultiplier = CONFIG.boost.multiplier + level * upgrade.multiplierPerLevel;
    this.boostStartCharge = Math.min(this.boostCapacity, CONFIG.boost.startCharge + level * upgrade.chargePerLevel);
    this.boostCharge = Math.min(this.boostCharge, this.boostCapacity);
  }

  get airborne(): boolean {
    return this.airTime >= 0;
  }

  /** 0..1 how boosted we are, for camera/FX. */
  get boost01(): number {
    return clamp((this.boostFactor - 1) / (this.boostMultiplier - 1), 0, 1);
  }

  get boostCharge01(): number {
    return clamp(this.boostCharge / this.boostCapacity, 0, 1);
  }

  get slowMultiplier(): number {
    if (this.slowRemaining <= 0) return 1;
    const t = 1 - this.slowRemaining / this.slowDuration;
    return lerp(this.slowStart, 1, smoothstep01(t));
  }

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.speed = 0;
    this.boostCharge = this.boostStartCharge;
    this.boosting = false;
    this.jumpReady = 0;
    this.airTime = -1;
    this.boostFactor = 1;
    this.boostLocked = false;
    this.slowRemaining = 0;
    this.floatTime = 0;
    this.crashTilt = 0;
    this.group.rotation.set(0, 0, 0);
    this.group.position.set(0, 0, 0);
  }

  addBoost(amount: number): void {
    this.boostCharge = Math.min(this.boostCapacity, this.boostCharge + amount);
  }

  /** Take a speed penalty. A harsher penalty always replaces a milder one in progress. */
  applySlow(multiplier: number, seconds: number): void {
    if (multiplier < this.slowMultiplier) {
      this.slowStart = multiplier;
      this.slowDuration = seconds;
      this.slowRemaining = seconds;
    }
  }

  shove(vx: number): void {
    this.vx += vx;
  }

  markCrashed(): void {
    this.crashTilt = 1;
  }

  update(dt: number, input: InputSnapshot, cruise: number, controllable: boolean): void {
    const P = CONFIG.player;
    const B = CONFIG.boost;

    // --- Steering (smooth, bounded, frame-rate independent) ---
    const axis = controllable ? input.axis : 0;
    this.vx = damp(this.vx, axis * P.maxLateralSpeed, P.lateralResponse, dt);
    const bound = CONFIG.road.width / 2 - CONFIG.road.edgeMargin - this.halfW;
    this.x = clamp(this.x + this.vx * dt, -bound, bound);
    if (Math.abs(this.x) >= bound) this.vx = 0;

    // --- Boost (hold-to-boost; locked after emptying until released) ---
    if (controllable && input.boost) {
      if (!this.boosting && !this.boostLocked && this.boostCharge >= B.minToStart) {
        this.boosting = true;
        this.events.onBoostStart?.();
      }
    } else {
      this.boostLocked = false;
      this.stopBoost();
    }
    if (this.boosting) {
      this.boostCharge -= B.drainPerSecond * dt;
      if (this.boostCharge <= 0) {
        this.boostCharge = 0;
        this.boostLocked = true;
        this.stopBoost();
      }
    } else {
      this.boostCharge = Math.min(this.boostCapacity, this.boostCharge + B.regenPerSecond * dt);
    }
    this.boostFactor = damp(this.boostFactor, this.boosting ? this.boostMultiplier : 1, B.response, dt);

    // --- Slowdown recovery ---
    if (this.slowRemaining > 0) this.slowRemaining = Math.max(0, this.slowRemaining - dt);

    // --- Jump ---
    if (this.jumpReady > 0) this.jumpReady = Math.max(0, this.jumpReady - dt);
    if (controllable && input.jumpPressed && this.jumpReady > 0 && !this.airborne) {
      this.airTime = 0;
      this.jumpReady = 0;
      this.events.onJump?.();
    }
    if (this.airborne) {
      this.airTime += dt;
      const u = this.airTime / CONFIG.jump.durationSeconds;
      if (u >= 1) {
        this.airTime = -1;
        this.y = 0;
        this.events.onLand?.();
      } else {
        this.y = CONFIG.jump.height * 4 * u * (1 - u);
      }
    }

    // --- Speed ---
    this.speed = cruise * this.boostFactor * this.slowMultiplier;

    // --- Visuals ---
    this.bobTime += dt * (6 + this.speed * 0.4);
    this.floatTime += dt;
    const bounce = this.airborne ? 0 : Math.sin(this.bobTime) * 0.025;
    const hover = this.floatingSkin
      ? CONFIG.player.floatingSkin.lift
        + Math.sin(this.floatTime * CONFIG.player.floatingSkin.bobFrequency * Math.PI * 2)
          * CONFIG.player.floatingSkin.bobAmplitude
      : 0;
    this.group.position.set(this.x, this.y + bounce + hover, 0);
    const lat = clamp(this.vx / P.maxLateralSpeed, -1, 1);
    this.group.rotation.set(
      this.airborne ? -0.12 : 0,
      -lat * P.yawAmount,
      -lat * P.leanAmount + this.crashTilt * 0.5,
    );
    const spin = (this.speed * dt) / this.wheelRadius;
    for (const w of this.wheels) w.rotation.x -= spin;
  }

  private stopBoost(): void {
    if (this.boosting) {
      this.boosting = false;
      this.events.onBoostEnd?.();
    }
  }
}
