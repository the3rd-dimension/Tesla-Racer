import * as THREE from 'three';
import { CONFIG } from '../config/gameConfig';
import { clamp, damp } from '../core/math';
import { chaserCloseRate } from '../systems/Difficulty';
import type { Footprint } from '../systems/Collision';
import { makeRickshaw } from '../vehicles/models';
import type { Vehicle } from '../traffic/TrafficManager';

export type ChaserState = 'chasing' | 'recovering';

export interface ChaserContext {
  playerX: number;
  playerHalfW: number;
  playerSpeed: number;
  cruise: number;
  difficulty: number;
  elapsed: number;
  obstacles: readonly Vehicle[];
  /** Freeze the gap (during the death sequence). */
  frozen: boolean;
}

/**
 * The rival auto-rickshaw behind the player.
 *
 * It trails at z = +gap. The gap shrinks when the player is slower than the chaser
 * (light hits, ram recovery) and grows when the player boosts. Reaching `catchGap`
 * with lateral overlap = a catch (ram). After a ram it drops back and cannot
 * catch again for a short cooldown. Heavy traffic is steered around; light
 * traffic is simply knocked aside (handled by the game).
 */
export class Chaser implements Footprint {
  readonly group = new THREE.Group();
  readonly halfW = CONFIG.chaser.halfW;
  readonly halfL = CONFIG.chaser.halfL;
  x = 0;
  /** Distance behind the player (also its world z). */
  z: number = CONFIG.chaser.startGap;
  state: ChaserState = 'chasing';

  private recoverTimer = 0;
  private cooldown = 0;
  private speed = 0;
  private lateral = 0;
  private wheels: THREE.Group[];
  private wheelRadius: number;
  private sirenLights: { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial; color: number }[] = [];
  private flashTime = 0;

  constructor() {
    const m = makeRickshaw({ body: 0xd62828, canopy: 0x1b1b1b, accent: 0xffc83d, lightBar: true });
    this.group.add(m.group);
    this.wheels = m.wheels;
    this.wheelRadius = m.wheelRadius;
    this.sirenLights = m.sirenLights;
    this.group.visible = false;
  }

  setModel(model: THREE.Object3D | undefined): void {
    if (!model) return;
    const built = makeRickshaw({ body: 0xd62828, canopy: 0x1b1b1b, accent: 0xffc83d, lightBar: true }, model);
    this.group.clear();
    this.group.add(built.group);
    this.wheels = built.wheels;
    this.wheelRadius = built.wheelRadius;
    this.sirenLights = built.sirenLights;
  }

  /** 0 (far) .. 1 (touching) - drives the HUD bar and vignette. */
  get proximity(): number {
    const c = CONFIG.chaser;
    return clamp(1 - (this.z - c.catchGap) / (c.dangerGap - c.catchGap), 0, 1);
  }

  reset(): void {
    this.x = 0;
    this.z = CONFIG.chaser.startGap;
    this.state = 'chasing';
    this.recoverTimer = 0;
    this.cooldown = 0;
    this.speed = 0;
    this.lateral = 0;
    this.flashTime = 0;
    this.updateSirenLights();
    this.group.rotation.set(0, 0, 0);
    this.group.position.set(0, 0, this.z);
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  /** Called after a ram: drop back, then chase again after a cooldown. */
  beginRecovery(): void {
    const c = CONFIG.chaser;
    this.state = 'recovering';
    this.recoverTimer = c.recoverSeconds;
    this.cooldown = c.catchCooldownSeconds;
  }

  /** True when the chaser is in position to ram the player right now. */
  isCatching(playerX: number, playerHalfW: number): boolean {
    if (this.state !== 'chasing' || this.cooldown > 0) return false;
    if (this.z > CONFIG.chaser.catchGap + 0.05) return false;
    return Math.abs(this.x - playerX) < (this.halfW + playerHalfW) * 0.95;
  }

  update(dt: number, ctx: ChaserContext): void {
    const c = CONFIG.chaser;
    this.flashTime += dt;
    this.updateSirenLights();
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);

    // --- Longitudinal: gap to the player ---
    if (!ctx.frozen) {
      if (this.state === 'recovering') {
        this.z = damp(this.z, c.recoverGap, c.recoverResponse, dt);
        this.speed = ctx.playerSpeed;
        this.recoverTimer -= dt;
        if (this.recoverTimer <= 0) this.state = 'chasing';
      } else {
        const rate = chaserCloseRate(ctx.difficulty, ctx.elapsed);
        this.speed = ctx.cruise * (1 + rate);
        this.z += (ctx.playerSpeed - this.speed) * dt;
      }
      this.z = clamp(this.z, c.catchGap, c.maxGap);
    }

    // --- Lateral: follow the player, steering round heavy traffic ---
    let target = ctx.playerX;
    const clearance = this.halfW + c.avoidMargin;
    const bound = CONFIG.road.width / 2 - CONFIG.road.edgeMargin - this.halfW;
    for (const v of ctx.obstacles) {
      if (v.knocked || v.spec.kind !== 'heavy') continue;
      const rearEdge = v.z + v.halfL; // towards the chaser
      const frontEdge = v.z - v.halfL; // towards the player
      const relevant = rearEdge > this.z - this.halfL - c.avoidLookAhead && frontEdge < this.z + this.halfL;
      if (!relevant) continue;
      if (Math.abs(v.x - target) >= v.halfW + clearance) continue;
      const left = v.x - v.halfW - clearance;
      const right = v.x + v.halfW + clearance;
      const leftOk = left >= -bound;
      const rightOk = right <= bound;
      if (leftOk && rightOk) target = Math.abs(left - this.x) < Math.abs(right - this.x) ? left : right;
      else if (leftOk) target = left;
      else if (rightOk) target = right;
    }
    if (!ctx.frozen) {
      const want = clamp((target - this.x) * c.lateralResponse, -c.lateralSpeed, c.lateralSpeed);
      this.lateral = damp(this.lateral, want, 12, dt);
      this.x = clamp(this.x + this.lateral * dt, -bound, bound);
    }

    // --- Visuals ---
    this.group.position.set(this.x, Math.sin(this.z * 7) * 0.02, this.z);
    this.group.rotation.set(0, -(this.lateral / c.lateralSpeed) * 0.12, -(this.lateral / c.lateralSpeed) * 0.07);
    if (!ctx.frozen) {
      const spin = (Math.max(this.speed, 0) * dt) / this.wheelRadius;
      for (const w of this.wheels) w.rotation.x -= spin;
    }
  }

  private updateSirenLights(): void {
    const activeIndex = Math.floor(this.flashTime / CONFIG.chaser.sirenFlashSeconds) % 2;
    this.sirenLights.forEach((light, index) => {
      light.material.color.setHex(index === activeIndex ? light.color : 0x101010);
    });
  }
}
