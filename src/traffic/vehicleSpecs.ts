/** Plain data (no three.js) so it can be unit-tested. Collision shapes are tuned separately from the models. */
export type VehicleTypeId = 'motorbike' | 'handcart' | 'car' | 'bus' | 'truck';
export type VehicleKind = 'light' | 'heavy';

export interface VehicleSpec {
  readonly id: VehicleTypeId;
  /** light: crashable (slowdown). heavy: ends the run. */
  readonly kind: VehicleKind;
  readonly halfW: number;
  readonly halfL: number;
  readonly height: number;
  /** Can the player pass over it while airborne? */
  readonly jumpable: boolean;
}

export const VEHICLE_SPECS: Readonly<Record<VehicleTypeId, VehicleSpec>> = {
  motorbike: { id: 'motorbike', kind: 'light', halfW: 0.5, halfL: 1.0, height: 1.8, jumpable: true },
  handcart: { id: 'handcart', kind: 'light', halfW: 0.95, halfL: 1.3, height: 1.7, jumpable: true },
  car: { id: 'car', kind: 'heavy', halfW: 1.0, halfL: 2.1, height: 1.6, jumpable: true },
  bus: { id: 'bus', kind: 'heavy', halfW: 1.5, halfL: 4.75, height: 3.2, jumpable: false },
  truck: { id: 'truck', kind: 'heavy', halfW: 1.4, halfL: 3.8, height: 3.2, jumpable: false },
};
