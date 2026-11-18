import { CONFIG } from '../config/gameConfig';

export class ScoreSystem {
  distance = 0;
  pickups = 0;
  money = 0;
  private bonus = 0;
  private penalty = 0;

  reset(): void {
    this.distance = 0;
    this.pickups = 0;
    this.money = 0;
    this.bonus = 0;
    this.penalty = 0;
  }

  addDistance(metres: number): void {
    if (metres > 0) this.distance += metres;
  }

  addPickup(): void {
    this.pickups += 1;
    this.bonus += CONFIG.score.perPickup;
  }

  addBumpReward(): void {
    this.money += CONFIG.money.bumpReward;
  }

  /** Penalties are tracked separately and the total never drops below zero. */
  penalize(points: number): void {
    this.penalty += Math.max(0, points);
  }

  get score(): number {
    return Math.max(0, this.distance * CONFIG.score.perMeter + this.bonus - this.penalty);
  }
}
