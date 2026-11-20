import { CONFIG } from '../config/gameConfig';
import { AudioManager } from '../audio/AudioManager';
import { Chaser } from '../chaser/Chaser';
import { CameraRig, type CameraView } from '../core/CameraRig';
import { ModelLibrary } from '../core/ModelLibrary';
import { GameRenderer } from '../core/Renderer';
import { MODEL_PATHS } from '../config/modelPaths';
import { clamp, smoothstep01 } from '../core/math';
import { InputManager, type InputSnapshot } from '../input/InputManager';
import { TouchControls } from '../input/TouchControls';
import { PickupManager } from '../pickups/PickupManager';
import { Player } from '../player/Player';
import { overlaps } from '../systems/Collision';
import { cruiseSpeed, difficulty, trafficSpeed } from '../systems/Difficulty';
import { ScoreSystem } from '../systems/ScoreSystem';
import { Storage, type Settings } from '../systems/Storage';
import { upgradeCost, type UpgradeId } from '../systems/Garage';
import { TrafficManager, type Vehicle } from '../traffic/TrafficManager';
import { STRINGS } from '../ui/strings';
import type { StoreData, UI } from '../ui/UI';
import { Road } from '../world/Road';

export type GameState = 'loading' | 'menu' | 'countdown' | 'playing' | 'paused' | 'gameover';
type DeathReason = 'crash' | 'caught';

const IDLE_INPUT: InputSnapshot = { axis: 0, boost: false, jumpPressed: false };
const LAUNCH_SECONDS = 1.2;

/** Orchestrates one run: state machine, fixed-step update loop, collisions, scoring, UI/audio hooks. */
export class Game {
  private state: GameState = 'loading';
  private prevRunState: 'countdown' | 'playing' = 'playing';

  private readonly gfx: GameRenderer;
  private readonly rig: CameraRig;
  private readonly road = new Road();
  private readonly traffic: TrafficManager;
  private readonly pickups: PickupManager;
  private readonly player = new Player();
  private readonly chaser = new Chaser();
  private readonly input = new InputManager();
  private readonly touch: TouchControls;
  private readonly audio = new AudioManager();
  private readonly storage = new Storage();
  private readonly models = new ModelLibrary();
  private readonly score = new ScoreSystem();
  private settings: Settings;

  private elapsed = 0;
  private time = 0;
  private launch = 0;
  private countdownT = 0;
  private countdownShown = -1;
  private catchCount = 0;
  private lastCatchAt = 0;
  private dying: DeathReason | null = null;
  private dyingT = 0;
  private warnCooldown = 0;
  private speedMultiplier = 1;
  private cameraView: CameraView = 'external';
  private catchLimit: number = CONFIG.chaser.catchesToEndRun;
  private lastFrame = 0;
  private acc = 0;

  constructor(
    root: HTMLElement,
    private readonly ui: UI,
  ) {
    this.settings = this.storage.getSettings();
    this.gfx = new GameRenderer(root);
    this.gfx.scene.add(this.road.root, this.player.group, this.chaser.group);
    this.traffic = new TrafficManager(this.gfx.scene);
    this.pickups = new PickupManager(this.gfx.scene);
    this.traffic.extraBlockers = () => this.pickups.active;
    this.pickups.blockers = () => this.traffic.active;
    this.rig = new CameraRig(this.gfx.camera);
    this.touch = new TouchControls(this.input);

    this.gfx.onResize = (rect) => this.ui.positionMirror(rect);
    this.ui.positionMirror(this.gfx.mirrorRect);
    this.gfx.onContextLost = () => {
      this.pause();
      this.ui.showFatal('The graphics context was lost. Please reload the page.');
    };
    this.gfx.onContextRestored = () => this.ui.hideFatal();

    this.input.onPause = () => this.togglePause();
    this.input.onModeChange = () => this.updateTouch();
    this.input.onFirstGesture = () => {
      this.audio.unlock();
      if (this.state === 'menu') this.audio.playMenuMusic();
    };
    this.input.onHorn = () => this.audio.horn();
    this.input.onSpecial = () => this.audio.playSpecialDialogue();

    this.player.events = {
      onBoostStart: () => this.audio.boostStart(),
      onBoostEnd: () => this.audio.boostEnd(),
      onJump: () => this.audio.jump(),
      onLand: () => this.audio.land(),
    };

    this.ui.handlers = {
      onPlay: () => this.startRun(),
      onRestart: () => this.startRun(),
      onResume: () => this.resume(),
      onMenu: () => this.goToMenu(),
      onPause: () => this.togglePause(),
      onCameraToggle: () => this.toggleCameraView(),
      onHorn: () => this.audio.horn(),
      onSpecial: () => this.audio.playSpecialDialogue(),
      onSettings: (patch) => this.applySettings(patch),
      onStoreOpen: () => this.openStore(),
      onBuyUpgrade: (id) => this.buyUpgrade(id),
      onBuySkin: (index) => this.buySkin(index),
      onEquipSkin: (index) => this.equipSkin(index),
    };
    this.ui.onClickSound = () => this.audio.click();
    this.ui.setSettingsValues(this.settings);
    this.audio.setSettings(this.settings);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
      else {
        this.lastFrame = performance.now();
        this.acc = 0;
      }
    });
    window.addEventListener('blur', () => this.pause());
  }

  async start(): Promise<void> {
    await this.models.load();
    this.road.setBuildingModels(this.models.buildings);
    this.traffic.setVehicleModels(this.models.vehicles);
    this.chaser.setModel(this.models.pickVehicle('chaser'));
    this.applyGarage();
    this.ui.hideLoading();
    this.goToMenu();
    this.lastFrame = performance.now();
    requestAnimationFrame(this.frame);
  }

  // ---------------------------------------------------------------- loop
  private readonly frame = (now: number): void => {
    requestAnimationFrame(this.frame);
    const R = CONFIG.run;
    const dt = Math.min((now - this.lastFrame) / 1000, R.maxFrameSeconds);
    this.lastFrame = now;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= R.fixedStep && steps < R.maxStepsPerFrame) {
      this.fixedUpdate(R.fixedStep);
      this.acc -= R.fixedStep;
      steps++;
    }
    if (steps === R.maxStepsPerFrame) this.acc = 0;

    const showMirror = this.state === 'countdown' || this.state === 'playing';
    this.rig.update(dt, this.player.x, this.player.group.position.y, this.player.boost01, this.gfx.aspect, this.cameraView);
    this.gfx.render(this.player.x, showMirror);
  };

  private fixedUpdate(dt: number): void {
    this.time += dt;
    switch (this.state) {
      case 'menu':
        this.road.update(8 * dt);
        this.player.update(dt, IDLE_INPUT, 8, false);
        break;
      case 'countdown':
        this.stepCountdown(dt);
        break;
      case 'playing':
        this.stepRun(dt);
        break;
      default:
        break;
    }
  }

  private stepCountdown(dt: number): void {
    this.countdownT -= dt;
    const shown = Math.ceil(Math.max(this.countdownT, 0) / CONFIG.run.countdownStepSeconds);
    if (shown !== this.countdownShown && shown > 0) {
      this.countdownShown = shown;
      this.ui.setCountdown(String(shown));
      this.audio.countdownTick();
    }
    this.player.update(dt, IDLE_INPUT, 0, false);
    if (this.countdownT <= 0) {
      this.ui.setCountdown(null);
      this.ui.toast(STRINGS.toastGo, 600);
      this.audio.go();
      this.setState('playing');
    }
  }

  private stepRun(dt: number): void {
    const R = CONFIG.run;
    const dying = this.dying !== null;
    if (dying) this.dyingT += dt;
    else this.elapsed += dt;
    this.launch = Math.min(1, this.launch + dt / LAUNCH_SECONDS);

    const d = difficulty(this.elapsed);
    const deathScale = dying ? clamp(1 - this.dyingT / R.deathSlowSeconds, 0, 1) : 1;
    const scale = smoothstep01(this.launch) * deathScale;
    const cruise = cruiseSpeed(d) * this.speedMultiplier * scale;

    this.player.update(dt, this.input.snapshot(), cruise, !dying);
    const ts = trafficSpeed(d) * scale;
    const rel = Math.max(dying ? 0 : 0.5, this.player.speed - ts);

    this.road.update(this.player.speed * dt);
    this.traffic.update(dt, rel, ts, d, !dying);
    this.pickups.update(dt, rel, !dying, this.time);
    this.chaser.update(dt, {
      playerX: this.player.x,
      playerHalfW: this.player.halfW,
      playerSpeed: this.player.speed,
      cruise,
      difficulty: d,
      elapsed: this.elapsed,
      obstacles: this.traffic.active,
      frozen: dying || this.launch < 0.3,
    });

    if (!dying) {
      this.checkCollisions();
      this.score.addDistance(this.player.speed * dt);
      this.forgetOldCatches();
    }

    this.audio.setEngine(this.player.speed, this.player.boosting);
    this.warnCooldown -= dt;
    if (!dying && this.chaser.proximity > 0.75 && this.warnCooldown <= 0) {
      this.audio.chaserClose();
      this.warnCooldown = 1.3;
    }

    this.pushHud();
    if (dying && this.dyingT >= R.deathDelaySeconds) this.endRun();
  }

  // ----------------------------------------------------------- collisions
  private checkCollisions(): void {
    const p = this.player;
    const shrink = CONFIG.collision.shrink;

    for (const v of this.traffic.active) {
      if (v.knocked || v.hit) continue;

      // The chaser bulldozes light traffic (cosmetic only).
      if (v.spec.kind === 'light' && overlaps(this.chaser, v, shrink)) {
        v.hit = true;
        v.knock(Math.sign(v.x - this.chaser.x) || 1);
        continue;
      }

      if (!overlaps(p, v, shrink)) continue;
      if (p.y >= CONFIG.jump.clearHeight && v.spec.jumpable) continue; // jumped over it

      v.hit = true;
      this.audio.vehicleHit();
      if (v.spec.kind === 'heavy') {
        this.die('crash');
        return;
      }
      this.onLightHit(v);
    }

    const pk = this.pickups.active;
    for (let i = pk.length - 1; i >= 0; i--) {
      if (!overlaps(p, pk[i], 1)) continue;
      const item = pk[i];
      this.pickups.collect(item);
      this.score.addPickup();
      if (item.type === 'boost') {
        p.addBoost(CONFIG.boost.pickupCharge);
        this.audio.pickup('boost');
        this.ui.toast(`${STRINGS.toastBoost}${CONFIG.boost.pickupCharge}`, 700);
      } else {
        p.jumpReady = CONFIG.jump.readySeconds; // refreshes if already active
        this.audio.pickup('jump');
        this.ui.toast(STRINGS.toastJump, 900);
      }
    }

    if (this.chaser.isCatching(p.x, p.halfW)) this.onCaught();
  }

  private onLightHit(v: Vehicle): void {
    const L = CONFIG.collision.light;
    v.knock(Math.sign(v.x - this.player.x) || (Math.random() < 0.5 ? -1 : 1));
    this.player.applySlow(L.speedMultiplier, L.recoverSeconds);
    this.score.penalize(L.scorePenalty);
    this.score.addBumpReward();
    this.storage.addMoney(CONFIG.money.bumpReward);
    this.rig.addShake(0.4);
    this.ui.toast(STRINGS.toastBump(L.scorePenalty, CONFIG.money.bumpReward), 700);
  }

  private onCaught(): void {
    const C = CONFIG.chaser;
    this.catchCount += 1;
    this.lastCatchAt = this.elapsed;
    if (this.catchCount >= this.catchLimit) {
      this.die('caught');
      return;
    }
    const away = Math.sign(this.player.x - this.chaser.x) || (Math.random() < 0.5 ? -1 : 1);
    this.player.applySlow(C.ramSlowMultiplier, C.ramSlowSeconds);
    this.player.shove(away * C.ramShove);
    this.score.penalize(C.ramScorePenalty);
    this.chaser.beginRecovery();
    this.rig.addShake(1);
    this.audio.ram();
    this.ui.toast(STRINGS.toastRam, 1400);
  }

  private forgetOldCatches(): void {
    const memory = CONFIG.chaser.catchMemorySeconds;
    if (memory > 0 && this.catchCount > 0 && this.elapsed - this.lastCatchAt > memory) {
      this.catchCount = 0;
    }
  }

  private die(reason: DeathReason): void {
    if (this.dying) return;
    this.dying = reason;
    this.dyingT = 0;
    this.player.markCrashed();
    this.input.releaseAll();
    this.rig.addShake(1.4);
    if (reason === 'crash') this.audio.heavyHit();
    else this.audio.ram();
  }

  private endRun(): void {
    const reason = this.dying ?? 'crash';
    const score = this.score.score;
    const newBest = this.storage.saveBest(score);
    this.audio.stopEngine();
    this.setState('gameover');
    this.ui.showGameOver({
      score,
      best: this.storage.getBest(),
      distance: this.score.distance,
      pickups: this.score.pickups,
      money: this.score.money,
      newBest,
      reason,
    });
  }

  // ------------------------------------------------------------ run state
  private startRun(): void {
    this.elapsed = 0;
    this.launch = 0;
    this.catchCount = 0;
    this.lastCatchAt = 0;
    this.dying = null;
    this.dyingT = 0;
    this.warnCooldown = 0;
    this.score.reset();
    this.player.reset();
    this.chaser.reset();
    this.traffic.reset();
    this.pickups.reset();
    this.road.reset();
    this.rig.reset();
    this.input.releaseAll();
    this.ui.closeModals();
    this.ui.clearHudState();

    this.countdownT = CONFIG.run.countdownSteps * CONFIG.run.countdownStepSeconds;
    this.countdownShown = -1;
    this.setState('countdown');
    this.pushHud();
  }

  private goToMenu(): void {
    this.dying = null;
    this.player.reset();
    this.chaser.reset();
    this.traffic.reset();
    this.pickups.reset();
    this.road.reset();
    this.rig.reset();
    this.input.releaseAll();
    this.ui.closeModals();
    this.ui.setCountdown(null);
    this.ui.clearHudState();
    this.ui.setBest(this.storage.getBest());
    this.ui.setTotalMoney(this.storage.getMoney());
    this.audio.stopEngine();
    this.setState('menu');
  }

  private applyGarage(): void {
    const garage = this.storage.getGarage();
    const floatingSkinIndex = MODEL_PATHS.skins.findIndex((path) => path.endsWith('/TeslaSkin2.glb'));
    const speed = CONFIG.store.upgrades.speed;
    const chaser = CONFIG.store.upgrades.chaser;
    this.speedMultiplier = 1 + garage.upgrades.speed * speed.speedPerLevel;
    this.catchLimit = CONFIG.chaser.catchesToEndRun + garage.upgrades.chaser * chaser.extraCatchesPerLevel;
    this.player.setBoostUpgrade(garage.upgrades.boost);
    this.player.setFloatingSkin(floatingSkinIndex >= 0 && garage.equippedSkin === floatingSkinIndex);
    this.player.setModel(
      garage.equippedSkin >= 0
        ? this.models.skins[garage.equippedSkin] ?? this.models.pickVehicle('player')
        : this.models.pickVehicle('player'),
    );
    this.ui.setStrikeLimit(this.catchLimit);
  }

  private openStore(): void {
    this.ui.showStore(this.storeData());
  }

  private storeData(): StoreData {
    const garage = this.storage.getGarage();
    const speed = CONFIG.store.upgrades.speed;
    const boost = CONFIG.store.upgrades.boost;
    const chaser = CONFIG.store.upgrades.chaser;
    const upgrades = (['speed', 'boost', 'chaser'] as const).map((id) => {
      const level = garage.upgrades[id];
      const maxLevel = CONFIG.store.upgrades[id].maxLevel;
      const effect = id === 'speed'
        ? `Cruise speed +${Math.round(level * speed.speedPerLevel * 100)}%`
        : id === 'boost'
          ? `Boost +${level * boost.chargePerLevel} capacity · ×${(CONFIG.boost.multiplier + level * boost.multiplierPerLevel).toFixed(2)} power`
          : `${CONFIG.chaser.catchesToEndRun + level * chaser.extraCatchesPerLevel} chaser hits before game over`;
      const nextEffect = level >= maxLevel
        ? 'Fully upgraded'
        : id === 'speed'
          ? `Next: +${Math.round(speed.speedPerLevel * 100)}% cruise speed`
          : id === 'boost'
            ? `Next: +${boost.chargePerLevel} capacity and +${boost.multiplierPerLevel.toFixed(2)} boost power`
            : `Next: +${chaser.extraCatchesPerLevel} chaser hit before game over`;
      return {
        id,
        name: id === 'chaser' ? 'Chaser Protection' : id === 'boost' ? 'Boost System' : 'Engine',
        level,
        maxLevel,
        effect,
        nextEffect,
        cost: level >= maxLevel ? null : upgradeCost(id, level),
      };
    });
    const skins = MODEL_PATHS.skins.map((path, index) => ({
      index,
      name: path.split('/').pop()?.replace(/\.glb$/i, '') ?? `Skin ${index + 1}`,
      available: this.models.skins[index] !== null,
      owned: garage.ownedSkins.includes(index),
      equipped: garage.equippedSkin === index,
      cost: CONFIG.store.skinCost,
    }));
    return { money: this.storage.getMoney(), upgrades, skins };
  }

  private buyUpgrade(id: UpgradeId): void {
    if (!this.storage.purchaseUpgrade(id)) {
      this.ui.toast(this.storage.getMoney() < (upgradeCost(id, this.storage.getGarage().upgrades[id])) ? STRINGS.toastNotEnoughMoney : 'Already fully upgraded');
      return;
    }
    this.applyGarage();
    this.ui.setTotalMoney(this.storage.getMoney());
    this.ui.showStore(this.storeData());
    this.ui.toast(STRINGS.toastPurchaseSuccess);
  }

  private buySkin(index: number): void {
    if (!this.models.skins[index]) {
      this.ui.toast(STRINGS.toastSkinUnavailable);
      return;
    }
    if (!this.storage.purchaseSkin(index)) {
      this.ui.toast(STRINGS.toastNotEnoughMoney);
      return;
    }
    this.applyGarage();
    this.ui.setTotalMoney(this.storage.getMoney());
    this.ui.showStore(this.storeData());
    this.ui.toast(STRINGS.toastPurchaseSuccess);
  }

  private equipSkin(index: number): void {
    if (!this.storage.equipSkin(index)) return;
    this.applyGarage();
    this.ui.showStore(this.storeData());
  }

  private pause(): void {
    if (this.state !== 'playing' && this.state !== 'countdown') return;
    this.prevRunState = this.state;
    this.input.releaseAll();
    this.audio.stopEngine();
    this.setState('paused');
  }

  private resume(): void {
    if (this.state !== 'paused') return;
    this.ui.closeModals();
    this.lastFrame = performance.now();
    this.acc = 0;
    this.setState(this.prevRunState);
  }

  private togglePause(): void {
    if (this.ui.closeModals()) return;
    if (this.state === 'paused') this.resume();
    else this.pause();
  }

  private toggleCameraView(): void {
    this.cameraView = this.cameraView === 'external' ? 'driver' : 'external';
    this.ui.setCameraView(this.cameraView);
  }

  private setState(next: GameState): void {
    this.state = next;
    if (next === 'menu') this.audio.playMenuMusic();
    else if (next === 'countdown' || next === 'playing') this.audio.playMusic();
    else if (next === 'paused') this.audio.pauseMusic();
    else this.audio.stopMusic();
    const run = next === 'countdown' || next === 'playing';
    this.input.enabled = run;
    this.chaser.setVisible(next !== 'menu' && next !== 'loading');
    this.ui.setMirrorVisible(next === 'countdown' || next === 'playing');

    switch (next) {
      case 'menu':
        this.ui.show('menu');
        break;
      case 'countdown':
      case 'playing':
        this.ui.show('hud');
        break;
      case 'paused':
        this.ui.show('hud', 'pause');
        break;
      case 'gameover':
        this.ui.show('gameover');
        break;
      default:
        break;
    }
    this.updateTouch();
  }

  // ----------------------------------------------------------------- misc
  private updateTouch(): void {
    const run = this.state === 'countdown' || this.state === 'playing';
    this.touch.setVisible(run && (this.input.mode === 'touch' || this.settings.forceTouch));
  }

  private applySettings(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch };
    this.storage.saveSettings(this.settings);
    this.audio.setSettings(this.settings);
    this.updateTouch();
  }

  private pushHud(): void {
    this.ui.updateHud({
      score: this.score.score,
      distance: this.score.distance,
      speed: this.player.speed,
      money: this.score.money,
      boost01: this.player.boostCharge01,
      boosting: this.player.boosting,
      chaser01: this.chaser.proximity,
      strikes: this.catchCount,
      jumpReady: this.player.jumpReady > 0,
    });
    this.touch.setJumpAvailable(this.player.jumpReady > 0 && this.dying === null);
  }
}
