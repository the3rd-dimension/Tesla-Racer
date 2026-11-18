import type { VehicleTypeId } from '../traffic/vehicleSpecs';

export const MODEL_PATHS = {
  buildings: [
    'assets/models/building1.glb',
    'assets/models/building2.glb',
    'assets/models/building3.glb',
    'assets/models/building4.glb',
  ],
  vehicles: {
    player: ['assets/models/Tesla.glb'],
    chaser: ['assets/models/chaser.glb'],
    motorbike: ['assets/models/motorbike.glb'],
    handcart: ['assets/models/handcart.glb'],
    car: ['assets/models/car.glb'],
    bus: ['assets/models/bus.glb'],
    truck: ['assets/models/truck.glb'],
  } satisfies Record<'player' | 'chaser' | VehicleTypeId, readonly string[]>,
  skins: [
    'assets/models/TeslaSkin1.glb',
    'assets/models/TeslaSkin2.glb',
  ],
} as const;

export type VehicleModelId = keyof typeof MODEL_PATHS.vehicles;
