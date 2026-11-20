import { CONFIG } from '../config/gameConfig';
import type { CameraView } from '../core/CameraRig';
import type { MirrorRect } from '../core/Renderer';
import type { UpgradeId } from '../systems/Garage';
import type { Settings } from '../systems/Storage';
import { formatTaka, STRINGS } from './strings';

export type ScreenName = 'menu' | 'hud' | 'pause' | 'gameover';

export interface UIHandlers {
  onPlay(): void;
  onResume(): void;
  onRestart(): void;
  onMenu(): void;
  onPause(): void;
  onCameraToggle(): void;
  onHorn(): void;
  onSpecial(): void;
  onSettings(patch: Partial<Settings>): void;
  onStoreOpen(): void;
  onBuyUpgrade(id: UpgradeId): void;
  onBuySkin(index: number): void;
  onEquipSkin(index: number): void;
}

export interface StoreUpgradeData {
  id: UpgradeId;
  name: string;
  level: number;
  maxLevel: number;
  effect: string;
  nextEffect: string;
  cost: number | null;
}

export interface StoreSkinData {
  index: number;
  name: string;
  available: boolean;
  owned: boolean;
  equipped: boolean;
  cost: number;
}

export interface StoreData {
  money: number;
  upgrades: StoreUpgradeData[];
  skins: StoreSkinData[];
}

export interface HudData {
  score: number;
  distance: number;
  speed: number;
  money: number;
  boost01: number;
  boosting: boolean;
  chaser01: number;
  strikes: number;
  jumpReady: boolean;
}

export interface GameOverData {
  score: number;
  best: number;
  distance: number;
  pickups: number;
  money: number;
  newBest: boolean;
  reason: 'crash' | 'caught';
}

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el as T;
};

export class UI {
  handlers: UIHandlers | null = null;
  /** Fired on every button click (UI click sound). */
  onClickSound: (() => void) | null = null;

  private readonly screens: Record<ScreenName, HTMLElement>;
  private readonly hudScore = $('hud-score');
  private readonly hudDistance = $('hud-distance');
  private readonly hudSpeed = $('hud-speed');
  private readonly hudMoney = $('hud-money');
  private readonly hudBoost = $('hud-boost-fill');
  private readonly hudChaser = $('hud-chaser-fill');
  private readonly hudJump = $('hud-jump');
  private readonly strikes: HTMLElement[] = [];
  private readonly toastEl = $('toast');
  private readonly countdownEl = $('countdown');
  private readonly mirrorEl = $('mirror-frame');
  private readonly vignette = $('danger-vignette');
  private readonly settingsEl = $('settings');
  private readonly howtoEl = $('howto');
  private readonly storeEl = $('store');
  private readonly storeMoney = $('store-money');
  private readonly storeUpgrades = $('store-upgrades');
  private readonly storeSkins = $('store-skins');
  private toastTimer = 0;
  private last = { score: '', dist: '', speed: -1, money: -1, boost: -1, chaser: -1, strikes: -1, jump: false, boosting: false, danger: -1 };

  constructor() {
    this.screens = { menu: $('menu'), hud: $('hud'), pause: $('pause'), gameover: $('gameover') };

    const strikeBox = $('hud-strikes');
    for (let i = 0; i < CONFIG.chaser.catchesToEndRun; i++) {
      const b = document.createElement('b');
      strikeBox.appendChild(b);
      this.strikes.push(b);
    }

    const click = (id: string, fn: () => void): void => {
      $(id).addEventListener('click', () => {
        this.onClickSound?.();
        fn();
      });
    };
    click('btn-play', () => this.handlers?.onPlay());
    click('btn-resume', () => this.handlers?.onResume());
    click('btn-restart', () => this.handlers?.onRestart());
    click('btn-restart-pause', () => this.handlers?.onRestart());
    click('btn-menu', () => this.handlers?.onMenu());
    click('btn-menu-pause', () => this.handlers?.onMenu());
    click('btn-pause', () => this.handlers?.onPause());
    click('btn-view', () => this.handlers?.onCameraToggle());
    click('btn-horn', () => this.handlers?.onHorn());
    click('btn-special', () => this.handlers?.onSpecial());
    click('btn-howto', () => this.setHidden(this.howtoEl, false));
    click('btn-howto-close', () => this.setHidden(this.howtoEl, true));
    click('btn-settings', () => this.setHidden(this.settingsEl, false));
    click('btn-settings-pause', () => this.setHidden(this.settingsEl, false));
    click('btn-settings-close', () => this.setHidden(this.settingsEl, true));
    click('btn-store', () => this.handlers?.onStoreOpen());
    click('btn-store-close', () => this.setHidden(this.storeEl, true));

    const range = (id: string, key: 'master' | 'sfx' | 'music'): void => {
      $<HTMLInputElement>(id).addEventListener('input', (e) => {
        this.handlers?.onSettings({ [key]: Number((e.target as HTMLInputElement).value) });
      });
    };
    range('set-master', 'master');
    range('set-sfx', 'sfx');
    range('set-music', 'music');
    $<HTMLInputElement>('set-mute').addEventListener('change', (e) => {
      this.handlers?.onSettings({ muted: (e.target as HTMLInputElement).checked });
    });
    $<HTMLInputElement>('set-touch').addEventListener('change', (e) => {
      this.handlers?.onSettings({ forceTouch: (e.target as HTMLInputElement).checked });
    });
  }

  // ---- screens ---------------------------------------------------------
  show(...names: ScreenName[]): void {
    (Object.keys(this.screens) as ScreenName[]).forEach((n) => this.setHidden(this.screens[n], !names.includes(n)));
  }

  /** Close the settings / how-to modal if open. Returns true if something was closed. */
  closeModals(): boolean {
    const open = !this.settingsEl.hidden || !this.howtoEl.hidden || !this.storeEl.hidden;
    this.setHidden(this.settingsEl, true);
    this.setHidden(this.howtoEl, true);
    this.setHidden(this.storeEl, true);
    return open;
  }

  hideLoading(): void {
    this.setHidden($('loading'), true);
  }

  hideFatal(): void {
    this.setHidden($('fatal'), true);
  }

  showFatal(message: string): void {
    this.hideLoading();
    $('fatal-msg').textContent = message;
    this.setHidden($('fatal'), false);
  }

  setSettingsValues(s: Settings): void {
    $<HTMLInputElement>('set-master').value = String(s.master);
    $<HTMLInputElement>('set-sfx').value = String(s.sfx);
    $<HTMLInputElement>('set-music').value = String(s.music);
    $<HTMLInputElement>('set-mute').checked = s.muted;
    $<HTMLInputElement>('set-touch').checked = s.forceTouch;
  }

  setBest(best: number): void {
    $('menu-best').textContent = best.toLocaleString();
  }

  setTotalMoney(money: number): void {
    $('menu-money').textContent = formatTaka(money);
  }

  showStore(data: StoreData): void {
    this.storeMoney.textContent = formatTaka(data.money);
    this.storeUpgrades.replaceChildren();
    for (const upgrade of data.upgrades) {
      const card = document.createElement('article');
      card.className = 'store-card';
      const title = document.createElement('strong');
      title.textContent = `${upgrade.name} · ${STRINGS.storeLevel(upgrade.level, upgrade.maxLevel)}`;
      const effect = document.createElement('p');
      effect.textContent = upgrade.effect;
      const next = document.createElement('small');
      next.textContent = upgrade.nextEffect;
      const button = document.createElement('button');
      button.className = 'btn store-action';
      button.textContent = upgrade.cost === null
        ? STRINGS.storeMaxLevel
        : `${STRINGS.storeUpgrade} · ${formatTaka(upgrade.cost)}`;
      button.disabled = upgrade.cost === null || upgrade.cost > data.money;
      button.addEventListener('click', () => {
        this.onClickSound?.();
        this.handlers?.onBuyUpgrade(upgrade.id);
      });
      card.append(title, effect, next, button);
      this.storeUpgrades.append(card);
    }

    this.storeSkins.replaceChildren();
    const defaultSkin = document.createElement('article');
    defaultSkin.className = 'store-card';
    const defaultName = document.createElement('strong');
    defaultName.textContent = STRINGS.storeDefaultSkin;
    const defaultDescription = document.createElement('p');
    defaultDescription.textContent = STRINGS.storeDefaultSkinDescription;
    const defaultButton = document.createElement('button');
    defaultButton.className = 'btn store-action';
    defaultButton.textContent = data.skins.some((skin) => skin.equipped)
      ? STRINGS.storeSelect
      : STRINGS.storeEquipped;
    defaultButton.disabled = !data.skins.some((skin) => skin.equipped);
    defaultButton.addEventListener('click', () => {
      this.onClickSound?.();
      this.handlers?.onEquipSkin(-1);
    });
    defaultSkin.append(defaultName, defaultDescription, defaultButton);
    this.storeSkins.append(defaultSkin);

    for (const skin of data.skins) {
      const card = document.createElement('article');
      card.className = 'store-card';
      const title = document.createElement('strong');
      title.textContent = skin.name;
      const description = document.createElement('p');
      description.textContent = !skin.available
        ? STRINGS.storeModelMissing
        : skin.equipped
          ? STRINGS.storeEquipped
          : skin.owned
            ? STRINGS.storeOwned
            : STRINGS.storeNewSkin;
      const button = document.createElement('button');
      button.className = 'btn store-action';
      if (!skin.available) {
        button.textContent = STRINGS.storeModelMissing;
        button.disabled = true;
      } else if (skin.equipped) {
        button.textContent = STRINGS.storeEquipped;
        button.disabled = true;
      } else if (skin.owned) {
        button.textContent = STRINGS.storeEquip;
        button.addEventListener('click', () => {
          this.onClickSound?.();
          this.handlers?.onEquipSkin(skin.index);
        });
      } else {
        button.textContent = `${STRINGS.storeBuy} · ${formatTaka(skin.cost)}`;
        button.disabled = skin.cost > data.money;
        button.addEventListener('click', () => {
          this.onClickSound?.();
          this.handlers?.onBuySkin(skin.index);
        });
      }
      card.append(title, description, button);
      this.storeSkins.append(card);
    }
    this.setHidden(this.storeEl, false);
  }

  setStrikeLimit(limit: number): void {
    const strikeBox = $('hud-strikes');
    this.strikes.splice(0, this.strikes.length);
    strikeBox.replaceChildren();
    for (let i = 0; i < limit; i++) {
      const strike = document.createElement('b');
      strikeBox.appendChild(strike);
      this.strikes.push(strike);
    }
    this.last.strikes = -1;
  }

  // ---- in-run ----------------------------------------------------------
  setCountdown(text: string | null): void {
    this.countdownEl.hidden = text === null;
    if (text !== null) this.countdownEl.textContent = text;
  }

  updateHud(h: HudData): void {
    const score = Math.floor(h.score).toLocaleString();
    if (score !== this.last.score) {
      this.hudScore.textContent = score;
      this.last.score = score;
    }
    const dist = String(Math.floor(h.distance));
    if (dist !== this.last.dist) {
      this.hudDistance.textContent = dist;
      this.last.dist = dist;
    }
    const speed = Math.round(h.speed * 3.6);
    if (speed !== this.last.speed) {
      this.hudSpeed.textContent = String(speed);
      this.last.speed = speed;
    }
    if (h.money !== this.last.money) {
      this.hudMoney.textContent = formatTaka(h.money);
      this.last.money = h.money;
    }
    const boost = Math.round(h.boost01 * 100);
    if (boost !== this.last.boost) {
      this.hudBoost.style.width = `${boost}%`;
      this.last.boost = boost;
    }
    if (h.boosting !== this.last.boosting) {
      this.hudBoost.parentElement?.classList.toggle('active', h.boosting);
      this.last.boosting = h.boosting;
    }
    const chaser = Math.round(h.chaser01 * 100);
    if (chaser !== this.last.chaser) {
      this.hudChaser.style.width = `${chaser}%`;
      this.last.chaser = chaser;
      this.vignette.style.opacity = String(Math.max(0, (h.chaser01 - 0.55) / 0.45) * 0.9);
    }
    if (h.strikes !== this.last.strikes) {
      this.strikes.forEach((s, i) => s.classList.toggle('on', i < h.strikes));
      this.last.strikes = h.strikes;
    }
    if (h.jumpReady !== this.last.jump) {
      this.setHidden(this.hudJump, !h.jumpReady);
      this.last.jump = h.jumpReady;
    }
  }

  toast(text: string, ms = 1000): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }

  clearHudState(): void {
    this.last = { score: '', dist: '', speed: -1, money: -1, boost: -1, chaser: -1, strikes: -1, jump: false, boosting: false, danger: -1 };
    this.vignette.style.opacity = '0';
    this.toastEl.classList.remove('show');
  }

  showGameOver(d: GameOverData): void {
    $('go-title').textContent = d.reason === 'caught' ? STRINGS.goTitleCaught : STRINGS.goTitleCrash;
    $('go-reason').textContent = d.reason === 'caught' ? STRINGS.goReasonCaught : STRINGS.goReasonCrash;
    this.setHidden($('go-record'), !d.newBest);
    $('go-score').textContent = Math.floor(d.score).toLocaleString();
    $('go-best').textContent = Math.floor(d.best).toLocaleString();
    $('go-distance').textContent = `${Math.floor(d.distance)} মিটার`;
    $('go-pickups').textContent = String(d.pickups);
    $('go-money').textContent = formatTaka(d.money);
    this.vignette.style.opacity = '0';
  }

  // ---- mirror ----------------------------------------------------------
  positionMirror(r: MirrorRect): void {
    const s = this.mirrorEl.style;
    s.left = `${r.left}px`;
    s.top = `${r.top}px`;
    s.width = `${r.width}px`;
    s.height = `${r.height}px`;
  }

  setMirrorVisible(visible: boolean): void {
    this.setHidden(this.mirrorEl, !visible || !CONFIG.mirror.enabled);
  }

  setCameraView(view: CameraView): void {
    const button = $('btn-view');
    const driver = view === 'driver';
    button.textContent = driver ? STRINGS.viewExternal : STRINGS.viewDriver;
    button.setAttribute('aria-label', driver ? 'বাহিরের দৃশ্যে যান' : 'চালকের আসনের দৃশ্যে যান');
  }

  private setHidden(el: HTMLElement, hidden: boolean): void {
    el.hidden = hidden;
  }
}
