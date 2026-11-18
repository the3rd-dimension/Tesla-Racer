import * as THREE from 'three';
import { CONFIG } from '../config/gameConfig';
import { damp } from './math';

/** Third-person chase camera with lateral follow, boost FOV kick, shake and portrait FOV compensation. */
export class CameraRig {
  private camX = 0;
  private lookX = 0;
  private fov: number = CONFIG.camera.fov;
  private shake = 0;
  private time = 0;

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  reset(): void {
    this.camX = 0;
    this.lookX = 0;
    this.shake = 0;
  }

  addShake(amount: number): void {
    this.shake = Math.min(1.5, this.shake + amount);
  }

  /** @param boost01 0..1 how "boosted" the player currently is */
  update(dt: number, playerX: number, boost01: number, aspect: number): void {
    const c = CONFIG.camera;
    this.time += dt;
    this.camX = damp(this.camX, playerX * 0.7, c.followLag, dt);
    this.lookX = damp(this.lookX, playerX * 0.85, c.followLag, dt);
    this.shake = damp(this.shake, 0, c.shakeDecay, dt);

    const sx = (Math.sin(this.time * 61) + Math.sin(this.time * 37)) * 0.5 * this.shake * c.shakeMagnitude;
    const sy = (Math.sin(this.time * 53) + Math.sin(this.time * 29)) * 0.5 * this.shake * c.shakeMagnitude;
    this.camera.position.set(this.camX + sx, c.height + sy, c.distance);
    this.camera.lookAt(this.lookX, c.lookHeight, -c.lookAhead);

    // Keep the road visible on narrow screens by widening the vertical FOV.
    const target = c.fov + (c.boostFov - c.fov) * boost01;
    this.fov = damp(this.fov, target, c.fovLag, dt);
    let fov = this.fov;
    if (aspect < c.minHorizontalAspect) {
      const half = Math.tan(THREE.MathUtils.degToRad(fov) / 2) * (c.minHorizontalAspect / aspect);
      fov = Math.min(c.maxFov, THREE.MathUtils.radToDeg(2 * Math.atan(half)));
    }
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }
}
