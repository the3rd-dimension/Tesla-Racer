import { CONFIG } from '../config/gameConfig';
import { MODEL_PATHS } from '../config/modelPaths';
import { DEFAULT_GARAGE, type GarageState, type UpgradeId, upgradeCost } from './Garage';
import type { PlayerProfile } from '../firebase/FirebaseBackend';

const BEST_KEY = 'teslaRacer.best.v1';
const MONEY_KEY = 'teslaRacer.money.v1';
const SETTINGS_KEY = 'teslaRacer.settings.v1';
const GARAGE_KEY = 'teslaRacer.garage.v1';

export interface Settings {
  master: number;
  sfx: number;
  music: number;
  muted: boolean;
  forceTouch: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8,
  sfx: 0.9,
  music: 0.6,
  muted: false,
  forceTouch: false,
};

/** localStorage wrapper that never throws (private mode, quota, disabled storage). */
export class Storage {
  private memory = new Map<string, string>();
  private cloudProfile: PlayerProfile | null = null;

  setCloudProfile(profile: PlayerProfile | null): void {
    this.cloudProfile = profile;
  }

  private read(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return this.memory.get(key) ?? null;
    }
  }

  private write(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      this.memory.set(key, value);
    }
  }

  getBest(): number {
    if (this.cloudProfile) return this.cloudProfile.bestScore;
    const n = Number(this.read(BEST_KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  /** Returns true if `score` is a new best (and saves it). */
  saveBest(score: number): boolean {
    const s = Math.floor(score);
    if (this.cloudProfile) return s > this.cloudProfile.bestScore;
    if (s > this.getBest()) {
      this.write(BEST_KEY, String(s));
      return true;
    }
    return false;
  }

  getMoney(): number {
    if (this.cloudProfile) return this.cloudProfile.money;
    const n = Number(this.read(MONEY_KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  addMoney(amount: number): number {
    if (!Number.isFinite(amount) || amount < 0) throw new RangeError('Money addition must be a nonnegative finite number.');
    if (this.cloudProfile) throw new Error('Authenticated money rewards must be saved through Firebase.');
    const total = this.getMoney() + Math.floor(amount);
    this.write(MONEY_KEY, String(total));
    return total;
  }

  getGarage(): GarageState {
    if (this.cloudProfile) {
      return {
        upgrades: { ...this.cloudProfile.garage.upgrades },
        ownedSkins: [...this.cloudProfile.garage.ownedSkins],
        equippedSkin: this.cloudProfile.garage.equippedSkin,
      };
    }
    try {
      const raw = this.read(GARAGE_KEY);
      if (!raw) return this.defaultGarage();
      const stored = JSON.parse(raw) as Partial<GarageState>;
      const upgrades = { ...DEFAULT_GARAGE.upgrades };
      for (const id of Object.keys(upgrades) as UpgradeId[]) {
        const level = stored.upgrades?.[id];
        if (typeof level === 'number' && Number.isFinite(level)) {
          upgrades[id] = Math.max(0, Math.min(CONFIG.store.upgrades[id].maxLevel, Math.floor(level)));
        }
      }
      const ownedSkins = Array.isArray(stored.ownedSkins)
        ? [...new Set(stored.ownedSkins.filter((i): i is number =>
          Number.isInteger(i) && i >= 0 && i < MODEL_PATHS.skins.length))]
        : [];
      const selectedSkin = stored.equippedSkin;
      const equippedSkin = typeof selectedSkin === 'number' && Number.isInteger(selectedSkin)
        && (selectedSkin === -1 || ownedSkins.includes(selectedSkin))
        ? selectedSkin
        : -1;
      return { upgrades, ownedSkins, equippedSkin };
    } catch {
      return this.defaultGarage();
    }
  }

  purchaseUpgrade(id: UpgradeId): boolean {
    if (this.cloudProfile) throw new Error('Authenticated upgrades must be purchased through Firebase.');
    const garage = this.getGarage();
    const level = garage.upgrades[id];
    if (level >= CONFIG.store.upgrades[id].maxLevel) return false;
    const cost = upgradeCost(id, level);
    if (this.getMoney() < cost) return false;
    this.write(MONEY_KEY, String(this.getMoney() - cost));
    garage.upgrades[id] += 1;
    this.saveGarage(garage);
    return true;
  }

  purchaseSkin(index: number): boolean {
    if (this.cloudProfile) throw new Error('Authenticated skins must be purchased through Firebase.');
    if (!Number.isInteger(index) || index < 0 || index >= MODEL_PATHS.skins.length) return false;
    const garage = this.getGarage();
    if (garage.ownedSkins.includes(index) || this.getMoney() < CONFIG.store.skinCost) return false;
    this.write(MONEY_KEY, String(this.getMoney() - CONFIG.store.skinCost));
    garage.ownedSkins.push(index);
    garage.equippedSkin = index;
    this.saveGarage(garage);
    return true;
  }

  equipSkin(index: number): boolean {
    if (this.cloudProfile) throw new Error('Authenticated skins must be equipped through Firebase.');
    const garage = this.getGarage();
    if (index !== -1 && !garage.ownedSkins.includes(index)) return false;
    garage.equippedSkin = index;
    this.saveGarage(garage);
    return true;
  }

  private defaultGarage(): GarageState {
    return {
      upgrades: { ...DEFAULT_GARAGE.upgrades },
      ownedSkins: [],
      equippedSkin: -1,
    };
  }

  private saveGarage(garage: GarageState): void {
    this.write(GARAGE_KEY, JSON.stringify(garage));
  }

  getSettings(): Settings {
    try {
      const raw = this.read(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  saveSettings(s: Settings): void {
    this.write(SETTINGS_KEY, JSON.stringify(s));
  }
}
