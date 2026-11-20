import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  runTransaction,
} from 'firebase/firestore';
import type { GarageState, UpgradeId } from '../systems/Garage';
import { upgradeCost } from '../systems/Garage';
import { CONFIG } from '../config/gameConfig';
import { MODEL_PATHS } from '../config/modelPaths';
import { firebaseConfig, isFirebaseConfigured } from './config';

export interface PlayerProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  bestScore: number;
  money: number;
  garage: GarageState;
}

export interface LeaderboardEntry {
  displayName: string;
  bestScore: number;
}

export class FirebaseBackend {
  readonly configured = isFirebaseConfigured;
  private readonly app = isFirebaseConfigured
    ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig))
    : null;
  private readonly auth = this.app ? getAuth(this.app) : null;
  private readonly db = this.app ? getFirestore(this.app) : null;
  private readonly googleProvider = new GoogleAuthProvider();

  constructor() {
    const app = this.app;
    if (!app || !firebaseConfig.measurementId) return;

    void isSupported()
      .then((supported) => {
        if (supported) getAnalytics(app);
      })
      .catch((error: unknown) => {
        console.error('[Tesla Surfers] Could not initialize Firebase Analytics.', error);
      });
  }

  watchAuth(callback: (user: User | null) => void): () => void {
    if (!this.auth) return () => {};
    return onAuthStateChanged(this.auth, callback);
  }

  async signIn(): Promise<void> {
    if (!this.auth) throw new Error('Firebase is not configured.');
    await signInWithPopup(this.auth, this.googleProvider);
  }

  async signOut(): Promise<void> {
    if (!this.auth) throw new Error('Firebase is not configured.');
    await signOut(this.auth);
  }

  async getProfile(): Promise<PlayerProfile> {
    const { user, db } = this.requireSession();
    const profileRef = doc(db, 'players', user.uid);
    const leaderboardRef = doc(db, 'leaderboard', user.uid);
    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(profileRef);
      const profile = snapshot.exists() ? this.readProfile(user, snapshot.data()) : this.createProfile(user);
      transaction.set(profileRef, profile);
      transaction.set(leaderboardRef, this.leaderboardRecord(profile));
      return profile;
    });
  }

  async completeRun(runId: string, score: number, moneyEarned: number): Promise<PlayerProfile> {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(runId)) throw new RangeError('A valid run ID is required.');
    if (!Number.isSafeInteger(score) || score < 0 || score > 100_000_000) {
      throw new RangeError('The score is invalid.');
    }
    if (!Number.isSafeInteger(moneyEarned) || moneyEarned < 0) {
      throw new RangeError('The run earnings are invalid.');
    }

    const { user, db } = this.requireSession();
    const profileRef = doc(db, 'players', user.uid);
    const leaderboardRef = doc(db, 'leaderboard', user.uid);
    const receiptRef = doc(db, 'players', user.uid, 'completedRuns', runId);
    return runTransaction(db, async (transaction) => {
      const [profileSnapshot, receiptSnapshot] = await Promise.all([
        transaction.get(profileRef),
        transaction.get(receiptRef),
      ]);
      const profile = profileSnapshot.exists()
        ? this.readProfile(user, profileSnapshot.data())
        : this.createProfile(user);
      if (receiptSnapshot.exists()) return profile;

      const updated: PlayerProfile = {
        ...profile,
        bestScore: Math.max(profile.bestScore, Math.floor(score)),
        money: profile.money + Math.min(Math.floor(moneyEarned), 1000),
      };
      transaction.set(profileRef, updated);
      transaction.set(leaderboardRef, this.leaderboardRecord(updated));
      transaction.set(receiptRef, { score: Math.floor(score), moneyEarned: Math.min(Math.floor(moneyEarned), 1000) });
      return updated;
    });
  }

  async purchaseUpgrade(upgradeId: UpgradeId): Promise<PlayerProfile> {
    const { user, db } = this.requireSession();
    const profileRef = doc(db, 'players', user.uid);
    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(profileRef);
      const profile = snapshot.exists() ? this.readProfile(user, snapshot.data()) : this.createProfile(user);
      const level = profile.garage.upgrades[upgradeId];
      const rule = CONFIG.store.upgrades[upgradeId];
      if (level >= rule.maxLevel) throw new Error('The upgrade is already at maximum level.');
      const cost = upgradeCost(upgradeId, level);
      if (profile.money < cost) throw new Error('There is not enough money.');

      const updated: PlayerProfile = {
        ...profile,
        money: profile.money - cost,
        garage: {
          ...profile.garage,
          upgrades: { ...profile.garage.upgrades, [upgradeId]: level + 1 },
        },
      };
      transaction.set(profileRef, updated);
      return updated;
    });
  }

  async purchaseSkin(skinIndex: number): Promise<PlayerProfile> {
    if (!Number.isInteger(skinIndex) || skinIndex < 0 || skinIndex >= MODEL_PATHS.skins.length) {
      throw new RangeError('The skin is invalid.');
    }
    const { user, db } = this.requireSession();
    const profileRef = doc(db, 'players', user.uid);
    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(profileRef);
      const profile = snapshot.exists() ? this.readProfile(user, snapshot.data()) : this.createProfile(user);
      if (profile.garage.ownedSkins.includes(skinIndex)) throw new Error('This skin has already been purchased.');
      if (profile.money < CONFIG.store.skinCost) throw new Error('There is not enough money.');

      const updated: PlayerProfile = {
        ...profile,
        money: profile.money - CONFIG.store.skinCost,
        garage: {
          ...profile.garage,
          ownedSkins: [...profile.garage.ownedSkins, skinIndex],
          equippedSkin: skinIndex,
        },
      };
      transaction.set(profileRef, updated);
      return updated;
    });
  }

  async equipSkin(skinIndex: number): Promise<PlayerProfile> {
    if (!Number.isInteger(skinIndex) || skinIndex < -1 || skinIndex >= MODEL_PATHS.skins.length) {
      throw new RangeError('The skin is invalid.');
    }
    const { user, db } = this.requireSession();
    const profileRef = doc(db, 'players', user.uid);
    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(profileRef);
      const profile = snapshot.exists() ? this.readProfile(user, snapshot.data()) : this.createProfile(user);
      if (skinIndex !== -1 && !profile.garage.ownedSkins.includes(skinIndex)) {
        throw new Error('This skin has not been purchased.');
      }
      const updated = {
        ...profile,
        garage: { ...profile.garage, equippedSkin: skinIndex },
      };
      transaction.set(profileRef, updated);
      return updated;
    });
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const { db } = this.requireSession();
    const topPlayers = query(collection(db, 'leaderboard'), orderBy('bestScore', 'desc'), limit(10));
    const snapshot = await getDocs(topPlayers);
    return snapshot.docs.map((entry) => {
      const data = entry.data();
      return {
        displayName: typeof data.displayName === 'string' && data.displayName.trim()
          ? data.displayName.trim().slice(0, 40)
          : 'চালক',
        bestScore: Number.isSafeInteger(data.bestScore) && data.bestScore >= 0 ? data.bestScore : 0,
      };
    });
  }

  private requireSession(): { user: User; db: NonNullable<FirebaseBackend['db']> } {
    if (!this.auth || !this.db) throw new Error('Firebase is not configured.');
    const user = this.auth.currentUser;
    if (!user) throw new Error('Google sign-in is required.');
    return { user, db: this.db };
  }

  private createProfile(user: User): PlayerProfile {
    return {
      uid: user.uid,
      displayName: user.displayName?.trim().slice(0, 40) || 'চালক',
      photoURL: user.photoURL,
      bestScore: 0,
      money: 0,
      garage: { upgrades: { speed: 0, boost: 0, chaser: 0 }, ownedSkins: [], equippedSkin: -1 },
    };
  }

  private readProfile(user: User, data: Record<string, unknown>): PlayerProfile {
    const garage = typeof data.garage === 'object' && data.garage !== null
      ? data.garage as {
        upgrades?: Partial<Record<UpgradeId, number>>;
        ownedSkins?: unknown;
        equippedSkin?: unknown;
      }
      : {};
    const savedUpgrades = garage.upgrades ?? {};
    const upgrades = { speed: 0, boost: 0, chaser: 0 };
    for (const id of Object.keys(upgrades) as UpgradeId[]) {
      const value = savedUpgrades[id];
      if (typeof value === 'number' && Number.isFinite(value)) {
        upgrades[id] = Math.max(0, Math.min(CONFIG.store.upgrades[id].maxLevel, Math.floor(value)));
      }
    }
    const ownedSkins = Array.isArray(garage.ownedSkins)
      ? [...new Set((garage.ownedSkins as unknown[]).filter((index): index is number =>
        typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < MODEL_PATHS.skins.length))]
      : [];
    const selectedSkin = garage.equippedSkin;
    const equippedSkin = typeof selectedSkin === 'number'
      && Number.isInteger(selectedSkin)
      && (selectedSkin === -1 || ownedSkins.includes(selectedSkin))
      ? selectedSkin
      : -1;
    return {
      uid: user.uid,
      displayName: user.displayName?.trim().slice(0, 40) || 'চালক',
      photoURL: user.photoURL,
      bestScore: Number.isSafeInteger(data.bestScore) && (data.bestScore as number) >= 0
        ? data.bestScore as number
        : 0,
      money: Number.isSafeInteger(data.money) && (data.money as number) >= 0 ? data.money as number : 0,
      garage: { upgrades, ownedSkins, equippedSkin },
    };
  }

  private leaderboardRecord(profile: PlayerProfile): LeaderboardEntry {
    return { displayName: profile.displayName, bestScore: profile.bestScore };
  }
}
