import { CONFIG } from '../config/gameConfig';

export type UpgradeId = keyof typeof CONFIG.store.upgrades;

export interface GarageState {
  upgrades: Record<UpgradeId, number>;
  ownedSkins: number[];
  equippedSkin: number;
}

export const DEFAULT_GARAGE: GarageState = {
  upgrades: { speed: 0, boost: 0, chaser: 0 },
  ownedSkins: [],
  equippedSkin: -1,
};

export function upgradeCost(id: UpgradeId, level: number): number {
  const upgrade = CONFIG.store.upgrades[id];
  return Math.floor(upgrade.baseCost * upgrade.costMultiplier ** level);
}
