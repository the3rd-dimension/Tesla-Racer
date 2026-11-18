import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_PATHS, type VehicleModelId } from '../config/modelPaths';

export class ModelLibrary {
  readonly buildings: THREE.Object3D[] = [];
  readonly skins: (THREE.Object3D | null)[] = [];
  readonly vehicles: Record<VehicleModelId, THREE.Object3D[]> = {
    player: [],
    chaser: [],
    motorbike: [],
    handcart: [],
    car: [],
    bus: [],
    truck: [],
  };

  async load(): Promise<void> {
    const loader = new GLTFLoader();
    const [buildings, player, chaser, motorbike, handcart, car, bus, truck, skins] = await Promise.all([
      this.loadVariants(loader, MODEL_PATHS.buildings, 'building'),
      this.loadVariants(loader, MODEL_PATHS.vehicles.player, 'player'),
      this.loadVariants(loader, MODEL_PATHS.vehicles.chaser, 'chaser'),
      this.loadVariants(loader, MODEL_PATHS.vehicles.motorbike, 'motorbike'),
      this.loadVariants(loader, MODEL_PATHS.vehicles.handcart, 'handcart'),
      this.loadVariants(loader, MODEL_PATHS.vehicles.car, 'car'),
      this.loadVariants(loader, MODEL_PATHS.vehicles.bus, 'bus'),
      this.loadVariants(loader, MODEL_PATHS.vehicles.truck, 'truck'),
      this.loadSlots(loader, MODEL_PATHS.skins, 'skin'),
    ]);

    if (buildings.length === 0) throw new Error('No roadside building models could be loaded.');
    this.buildings.push(...buildings);
    this.vehicles.player.push(...player);
    this.vehicles.chaser.push(...chaser);
    this.vehicles.motorbike.push(...motorbike);
    this.vehicles.handcart.push(...handcart);
    this.vehicles.car.push(...car);
    this.vehicles.bus.push(...bus);
    this.vehicles.truck.push(...truck);
    this.skins.push(...skins);
  }

  pickVehicle(id: VehicleModelId, rng: () => number = Math.random): THREE.Object3D | undefined {
    const variants = this.vehicles[id];
    if (variants.length === 0) return undefined;
    return variants[Math.floor(rng() * variants.length) % variants.length];
  }

  private async loadVariants(
    loader: GLTFLoader,
    paths: readonly string[],
    label: string,
  ): Promise<THREE.Object3D[]> {
    const loaded = await Promise.all(paths.map(async (path) => {
      try {
        const { scene } = await loader.loadAsync(`${import.meta.env.BASE_URL}${path}`);
        scene.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(scene);
        const size = bounds.getSize(new THREE.Vector3());
        if (bounds.isEmpty() || size.x <= 0 || size.y <= 0 || size.z <= 0) {
          throw new Error('The model has invalid dimensions.');
        }
        return scene;
      } catch (error) {
        console.warn(`[Tesla Racer] Could not load ${label} model "${path}".`, error);
        return null;
      }
    }));
    return loaded.filter((model): model is THREE.Group => model !== null);
  }

  private async loadSlots(
    loader: GLTFLoader,
    paths: readonly string[],
    label: string,
  ): Promise<(THREE.Group | null)[]> {
    return Promise.all(paths.map(async (path) => {
      try {
        const { scene } = await loader.loadAsync(`${import.meta.env.BASE_URL}${path}`);
        scene.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(scene);
        const size = bounds.getSize(new THREE.Vector3());
        if (bounds.isEmpty() || size.x <= 0 || size.y <= 0 || size.z <= 0) {
          throw new Error('The model has invalid dimensions.');
        }
        return scene;
      } catch (error) {
        console.warn(`[Tesla Racer] Could not load ${label} model "${path}".`, error);
        return null;
      }
    }));
  }
}
