import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config/gameConfig';
import { clamp, createRng, damp } from '../src/core/math';
import { overlaps } from '../src/systems/Collision';
import { chaserCloseRate, cruiseSpeed, difficulty, spawnGapMeters, trafficSpeed } from '../src/systems/Difficulty';
import { ScoreSystem } from '../src/systems/ScoreSystem';

describe('difficulty', () => {
  it('stays 0 during grace, reaches 1, and never decreases', () => {
    expect(difficulty(0)).toBe(0);
    expect(difficulty(CONFIG.difficulty.graceSeconds)).toBe(0);
    expect(difficulty(10_000)).toBe(1);
    let prev = 0;
    for (let t = 0; t < 400; t += 1) {
      const d = difficulty(t);
      expect(d).toBeGreaterThanOrEqual(prev);
      prev = d;
    }
  });

  it('traffic never outpaces the slowest cruise speed', () => {
    for (const d of [0, 0.5, 1]) expect(trafficSpeed(d)).toBeLessThan(cruiseSpeed(d));
  });

  it('spawn gap respects the minimum', () => {
    expect(spawnGapMeters(0, 1)).toBeGreaterThanOrEqual(CONFIG.traffic.minGapMeters);
  });

  it('chaser pressure ramps in and is positive', () => {
    expect(chaserCloseRate(0, 0)).toBe(0);
    expect(chaserCloseRate(0, 999)).toBeGreaterThan(0);
  });
});

describe('collision', () => {
  const a = { x: 0, z: 0, halfW: 1, halfL: 1 };
  it('detects overlap and separation', () => {
    expect(overlaps(a, { x: 1.5, z: 0, halfW: 1, halfL: 1 })).toBe(true);
    expect(overlaps(a, { x: 3, z: 0, halfW: 1, halfL: 1 })).toBe(false);
  });
  it('shrink makes hits more forgiving', () => {
    const b = { x: 1.9, z: 0, halfW: 1, halfL: 1 };
    expect(overlaps(a, b, 1)).toBe(true);
    expect(overlaps(a, b, 0.9)).toBe(false);
  });
});

describe('score', () => {
  it('adds distance and pickups, never goes negative', () => {
    const s = new ScoreSystem();
    s.addDistance(100);
    s.addPickup();
    expect(s.score).toBe(100 * CONFIG.score.perMeter + CONFIG.score.perPickup);
    s.penalize(10_000);
    expect(s.score).toBe(0);
    s.reset();
    expect(s.score).toBe(0);
  });

  it('awards configured money for bumps and resets it between runs', () => {
    const s = new ScoreSystem();
    s.addBumpReward();
    s.addBumpReward();
    expect(s.money).toBe(CONFIG.money.bumpReward * 2);
    s.reset();
    expect(s.money).toBe(0);
  });
});

describe('math', () => {
  it('rng is deterministic', () => {
    expect(createRng(5)()).toBe(createRng(5)());
  });
  it('clamp and damp behave', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(damp(0, 10, 5, 0)).toBe(0);
    expect(damp(0, 10, 5, 100)).toBeCloseTo(10, 3);
  });
});
