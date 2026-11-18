import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../src/config/gameConfig';
import { upgradeCost } from '../src/systems/Garage';
import { Storage } from '../src/systems/Storage';

describe('storage money', () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubStorage = (): Map<string, string> => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    return values;
  };

  it('accumulates money and keeps the total across Storage instances', () => {
    stubStorage();
    const first = new Storage();
    expect(first.getMoney()).toBe(0);
    expect(first.addMoney(10)).toBe(10);
    expect(first.addMoney(25)).toBe(35);
    expect(new Storage().getMoney()).toBe(35);
  });

  it('charges for upgrades and persists the purchased level', () => {
    stubStorage();
    const storage = new Storage();
    storage.addMoney(upgradeCost('speed', 0));
    expect(storage.purchaseUpgrade('speed')).toBe(true);
    expect(storage.getMoney()).toBe(0);
    expect(storage.getGarage().upgrades.speed).toBe(1);
    expect(storage.purchaseUpgrade('speed')).toBe(false);
    expect(new Storage().getGarage().upgrades.speed).toBe(1);
  });

  it('purchases and equips skins without allowing duplicate purchases', () => {
    stubStorage();
    const storage = new Storage();
    storage.addMoney(CONFIG.store.skinCost * 2);
    expect(storage.purchaseSkin(0)).toBe(true);
    expect(storage.getGarage().equippedSkin).toBe(0);
    expect(storage.purchaseSkin(0)).toBe(false);
    expect(storage.equipSkin(-1)).toBe(true);
    expect(storage.getGarage().equippedSkin).toBe(-1);
    expect(storage.purchaseSkin(-1)).toBe(false);
  });

  it('rejects invalid additions', () => {
    const storage = new Storage();
    expect(() => storage.addMoney(-1)).toThrow(RangeError);
    expect(() => storage.addMoney(Number.NaN)).toThrow(RangeError);
  });
});
