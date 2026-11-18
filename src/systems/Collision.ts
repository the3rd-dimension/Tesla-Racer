/** Simple axis-aligned footprint on the road plane (x = across, z = along). */
export interface Footprint {
  readonly x: number;
  readonly z: number;
  readonly halfW: number;
  readonly halfL: number;
}

/**
 * AABB overlap test. `shrink` scales both footprints' half-extents (fairness),
 * `margin` adds clearance (used for spawn checks).
 */
export function overlaps(a: Footprint, b: Footprint, shrink = 1, margin = 0): boolean {
  const dx = Math.abs(a.x - b.x);
  const dz = Math.abs(a.z - b.z);
  return dx < (a.halfW + b.halfW) * shrink + margin && dz < (a.halfL + b.halfL) * shrink + margin;
}
