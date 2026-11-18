import { describe, expect, it } from 'vitest';
import { PATTERNS, patternBounds, validateAllPatterns, validatePattern } from '../src/traffic/patterns';

describe('traffic patterns', () => {
  it('every pattern leaves a gap the player can fit through', () => {
    expect(validateAllPatterns()).toEqual([]);
  });

  it('rejects a pattern that blocks the whole road', () => {
    const wall = {
      id: 'wall',
      minDifficulty: 0,
      weight: 1,
      entries: [
        { type: 'bus' as const, x: -4.8, dz: 0 },
        { type: 'bus' as const, x: 0, dz: 0 },
        { type: 'bus' as const, x: 4.8, dz: 0 },
      ],
    };
    expect(validatePattern(wall)).toBe(false);
  });

  it('has a pattern available from difficulty 0 and unique ids', () => {
    expect(PATTERNS.some((p) => p.minDifficulty === 0)).toBe(true);
    expect(new Set(PATTERNS.map((p) => p.id)).size).toBe(PATTERNS.length);
  });

  it('computes sane bounds', () => {
    for (const p of PATTERNS) {
      const b = patternBounds(p);
      expect(b.far).toBeGreaterThan(0);
      expect(b.near).toBeGreaterThan(0);
    }
  });
});
