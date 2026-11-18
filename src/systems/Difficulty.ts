import { CONFIG } from '../config/gameConfig';
import { lerp, smoothstep01 } from '../core/math';

/** 0 -> 1 over the run, based on elapsed time (never frame count). */
export function difficulty(elapsedSeconds: number): number {
  const t = (elapsedSeconds - CONFIG.difficulty.graceSeconds) / CONFIG.difficulty.rampSeconds;
  return smoothstep01(t);
}

export function cruiseSpeed(d: number): number {
  return lerp(CONFIG.speed.start, CONFIG.speed.max, d);
}

export function trafficSpeed(d: number): number {
  return lerp(CONFIG.traffic.speedStart, CONFIG.traffic.speedMax, d);
}

/** Road distance required between consecutive traffic patterns. */
export function spawnGapMeters(d: number, relativeSpeed: number): number {
  const reaction = lerp(CONFIG.traffic.reactionSecondsStart, CONFIG.traffic.reactionSecondsEnd, d);
  return Math.max(CONFIG.traffic.minGapMeters, reaction * relativeSpeed);
}

/** How quickly the chaser gains on a non-boosting player (fraction of cruise speed). */
export function chaserCloseRate(d: number, elapsedSeconds: number): number {
  const c = CONFIG.chaser;
  const ramp = smoothstep01(elapsedSeconds / c.graceSeconds);
  return lerp(c.closeRateStart, c.closeRateMax, d) * ramp;
}
