import { CONFIG } from '../config/gameConfig';
import { VEHICLE_SPECS, type VehicleTypeId } from './vehicleSpecs';

/**
 * Predefined, tested spawn patterns (no unconstrained randomness).
 * x  = lateral centre in metres (0 = road centre; patterns may be mirrored at spawn)
 * dz = extra distance ahead of the pattern origin (0 = nearest to the player)
 * Every pattern must always leave a gap the player can fit through (see validatePattern).
 */
export interface PatternEntry {
  readonly type: VehicleTypeId;
  readonly x: number;
  readonly dz: number;
}

export interface TrafficPattern {
  readonly id: string;
  /** Difficulty (0..1) at which the pattern can first appear. */
  readonly minDifficulty: number;
  readonly weight: number;
  readonly entries: readonly PatternEntry[];
}

const L2 = -4.8;
const L1 = -2.4;
const C = 0;
const R1 = 2.4;
const R2 = 4.8;

export const PATTERNS: readonly TrafficPattern[] = [
  { id: 'single-bike', minDifficulty: 0, weight: 5, entries: [{ type: 'motorbike', x: L1, dz: 0 }] },
  { id: 'single-cart', minDifficulty: 0, weight: 4, entries: [{ type: 'handcart', x: R1, dz: 0 }] },
  { id: 'lone-car', minDifficulty: 0.02, weight: 3, entries: [{ type: 'car', x: C, dz: 0 }] },
  {
    id: 'bike-and-cart',
    minDifficulty: 0.04,
    weight: 4,
    entries: [
      { type: 'motorbike', x: L2, dz: 0 },
      { type: 'handcart', x: R1, dz: 6 },
    ],
  },
  { id: 'bus-left', minDifficulty: 0.1, weight: 4, entries: [{ type: 'bus', x: L2, dz: 0 }] },
  { id: 'truck-right', minDifficulty: 0.14, weight: 4, entries: [{ type: 'truck', x: R1, dz: 0 }] },
  {
    id: 'bus-then-bike',
    minDifficulty: 0.22,
    weight: 3,
    entries: [
      { type: 'bus', x: L2, dz: 0 },
      { type: 'motorbike', x: 3.0, dz: 14 },
    ],
  },
  {
    id: 'bike-swarm',
    minDifficulty: 0.25,
    weight: 3,
    entries: [
      { type: 'motorbike', x: L2, dz: 0 },
      { type: 'motorbike', x: C, dz: 3 },
      { type: 'motorbike', x: R2, dz: 0 },
    ],
  },
  {
    id: 'slalom',
    minDifficulty: 0.35,
    weight: 3,
    entries: [
      { type: 'truck', x: -3.0, dz: 0 },
      { type: 'car', x: 3.0, dz: 12 },
      { type: 'bus', x: -4.5, dz: 28 },
    ],
  },
  {
    id: 'pincer',
    minDifficulty: 0.45,
    weight: 3,
    entries: [
      { type: 'bus', x: L2, dz: 0 },
      { type: 'truck', x: 4.9, dz: 0 },
    ],
  },
  {
    id: 'car-wall',
    minDifficulty: 0.55,
    weight: 2,
    entries: [
      { type: 'car', x: L2, dz: 0 },
      { type: 'car', x: C, dz: 0 },
      { type: 'car', x: R2, dz: 0 },
    ],
  },
  {
    id: 'truck-convoy',
    minDifficulty: 0.65,
    weight: 2,
    entries: [
      { type: 'truck', x: L1, dz: 0 },
      { type: 'truck', x: R1, dz: 15 },
    ],
  },
];

export interface PatternBounds {
  /** How far (m) the pattern's nearest edge extends towards the player from its origin. */
  readonly near: number;
  /** How far (m) the pattern's far edge extends away from the player beyond its origin. */
  readonly far: number;
}

export function patternBounds(p: TrafficPattern): PatternBounds {
  let near = -Infinity;
  let far = -Infinity;
  for (const e of p.entries) {
    const hl = VEHICLE_SPECS[e.type].halfL;
    near = Math.max(near, hl - e.dz);
    far = Math.max(far, e.dz + hl);
  }
  return { near, far };
}

/**
 * A pattern is valid when, at every point along its length, there is a free
 * lateral gap of at least `minGap` metres, and everything is inside the road.
 */
export function validatePattern(
  p: TrafficPattern,
  roadWidth: number = CONFIG.road.width,
  minGap: number = CONFIG.traffic.safeGapMeters,
  edgeMargin: number = CONFIG.road.edgeMargin,
): boolean {
  const half = roadWidth / 2 - edgeMargin;

  for (const e of p.entries) {
    const s = VEHICLE_SPECS[e.type];
    if (Math.abs(e.x) + s.halfW > roadWidth / 2) return false;
  }

  const probes = new Set<number>();
  for (const e of p.entries) {
    const hl = VEHICLE_SPECS[e.type].halfL;
    probes.add(e.dz - hl + 0.01);
    probes.add(e.dz + hl - 0.01);
    probes.add(e.dz);
  }

  for (const z of probes) {
    const blocked: Array<[number, number]> = [];
    for (const e of p.entries) {
      const s = VEHICLE_SPECS[e.type];
      if (Math.abs(z - e.dz) <= s.halfL) blocked.push([e.x - s.halfW, e.x + s.halfW]);
    }
    blocked.sort((a, b) => a[0] - b[0]);
    let cursor = -half;
    let best = 0;
    for (const [lo, hi] of blocked) {
      best = Math.max(best, Math.min(lo, half) - cursor);
      cursor = Math.max(cursor, hi);
    }
    best = Math.max(best, half - cursor);
    if (best < minGap) return false;
  }
  return true;
}

export function validateAllPatterns(): string[] {
  return PATTERNS.filter((p) => !validatePattern(p)).map((p) => p.id);
}
