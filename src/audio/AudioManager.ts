import { clamp } from '../core/math';
import { AUDIO_PATHS } from '../config/audioConfig';
import { CONFIG } from '../config/gameConfig';
import type { Settings } from '../systems/Storage';

/**
 * Procedural placeholder audio (Web Audio API, no files needed).
 * Replace individual sounds with real assets later - keep the method names so
 * Game.ts does not change. The AudioContext is created on the first user gesture.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private engine: { osc: OscillatorNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
  private wind: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private voices = 0;
  private readonly hornAudio = this.createAudio(AUDIO_PATHS.horn);
  private readonly specialDialogue = this.createAudio(AUDIO_PATHS.specialDialogue);
  private readonly vehicleHitSounds = AUDIO_PATHS.vehicleHit.map((path) => this.createAudio(path));
  private readonly chaserCloseAudio = AUDIO_PATHS.chaserClose.map((path) => this.createAudio(path));
  private readonly mainMenuTracks = AUDIO_PATHS.mainMenuMusic.map((path) => {
    const audio = this.createAudio(path);
    audio.loop = true;
    return audio;
  });
  private readonly musicTracks = AUDIO_PATHS.backgroundMusic.map((path) => {
    const audio = this.createAudio(path);
    audio.loop = true;
    return audio;
  });
  private currentMusic: HTMLAudioElement | null = null;
  private currentMusicType: 'menu' | 'gameplay' | null = null;
  private unlocked = false;
  private readonly defaultChaserCloseSounds: readonly (() => void)[] = [() => this.warn(), () => this.horn()];
  private settings: Settings = { master: 0.8, sfx: 0.9, music: 0.6, muted: false, forceTouch: false };

  /** Must be called from a user gesture (browser autoplay policy). */
  unlock(): void {
    this.unlocked = true;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.sfx.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setSettings(s: Settings): void {
    this.settings = s;
    this.applyVolumes();
    this.updateAudioVolumes();
  }

  private applyVolumes(): void {
    if (!this.master || !this.sfx) return;
    this.master.gain.value = this.settings.muted ? 0 : this.settings.master;
    this.sfx.gain.value = this.settings.sfx;
  }

  // ---- one-shots -------------------------------------------------------
  click(): void {
    this.tone(660, 0.06, 'square', 0.12);
  }
  horn(): void {
    this.playAudio(this.hornAudio, 'horn.mp3', this.settings.sfx);
  }
  playSpecialDialogue(): void {
    this.playAudio(this.specialDialogue, 'SpecialDialogue.mp3', this.settings.sfx);
  }
  countdownTick(): void {
    this.tone(520, 0.12, 'square', 0.18);
  }
  go(): void {
    this.tone(780, 0.28, 'square', 0.2, 1170);
  }
  boostStart(): void {
    this.tone(220, 0.45, 'sawtooth', 0.2, 880);
    this.setWind(true);
  }
  boostEnd(): void {
    this.tone(500, 0.2, 'triangle', 0.14, 200);
    this.setWind(false);
  }
  lightHit(): void {
    this.noise(0.14, 0.3, 1400);
    this.tone(180, 0.15, 'square', 0.18, 90);
  }
  heavyHit(): void {
    this.noise(0.6, 0.55, 600);
    this.tone(110, 0.5, 'sawtooth', 0.35, 40);
    this.duckEngine();
  }
  ram(): void {
    this.noise(0.35, 0.45, 900);
    this.tone(150, 0.3, 'square', 0.3, 60);
    this.tone(300, 0.2, 'sawtooth', 0.15, 120, 0.05);
  }
  pickup(kind: 'boost' | 'jump'): void {
    if (kind === 'boost') {
      this.tone(660, 0.1, 'triangle', 0.2);
      this.tone(990, 0.16, 'triangle', 0.2, undefined, 0.08);
    } else {
      this.tone(440, 0.14, 'triangle', 0.2, 880);
    }
  }
  jump(): void {
    this.tone(300, 0.25, 'sine', 0.2, 700);
  }
  land(): void {
    this.tone(140, 0.12, 'sine', 0.2, 80);
  }
  /** Warning horn when the chaser is very close. */
  warn(): void {
    this.tone(420, 0.1, 'square', 0.1);
    this.tone(420, 0.1, 'square', 0.1, undefined, 0.16);
  }
  vehicleHit(): void {
    this.playRandomAudio(this.vehicleHitSounds, 'vehicle-hit audio');
  }
  chaserClose(): void {
    if (this.chaserCloseAudio.length > 0) this.playRandomAudio(this.chaserCloseAudio, 'chaser-close audio');
    else this.playRandom(this.defaultChaserCloseSounds);
  }

  playMusic(): void {
    this.playMusicTracks(this.musicTracks, 'gameplay');
  }

  playMenuMusic(): void {
    this.playMusicTracks(this.mainMenuTracks, 'menu');
  }

  private playMusicTracks(tracks: readonly HTMLAudioElement[], type: 'menu' | 'gameplay'): void {
    if (!this.unlocked || tracks.length === 0) {
      if (this.currentMusicType !== type) this.stopMusic();
      return;
    }
    if (this.currentMusicType !== type) this.stopMusic();
    if (!this.currentMusic) {
      this.currentMusic = tracks[Math.floor(Math.random() * tracks.length)];
      this.currentMusicType = type;
    }
    this.currentMusic.volume = this.settings.muted
      ? 0
      : this.settings.master * this.settings.music * (type === 'menu' ? CONFIG.audio.menuMusicVolume : 1);
    void this.currentMusic.play().catch((error: unknown) => {
      console.warn(`[Tesla Surfers] Could not play ${type} music.`, error);
    });
  }

  pauseMusic(): void {
    this.currentMusic?.pause();
  }

  stopMusic(): void {
    if (!this.currentMusic) return;
    this.currentMusic.pause();
    this.currentMusic.currentTime = 0;
    this.currentMusic = null;
    this.currentMusicType = null;
  }

  // ---- loops -----------------------------------------------------------
  setEngine(speed: number, boosting: boolean): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfx) return;
    if (!this.engine) {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      gain.gain.value = 0.0001;
      osc.connect(filter).connect(gain).connect(this.sfx);
      osc.start();
      this.engine = { osc, gain, filter };
    }
    const f = 48 + speed * 2.4 + (boosting ? 18 : 0);
    this.engine.osc.frequency.setTargetAtTime(f, ctx.currentTime, 0.08);
    this.engine.gain.gain.setTargetAtTime(0.07, ctx.currentTime, 0.1);
  }

  stopEngine(): void {
    if (this.ctx && this.engine) this.engine.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
    this.setWind(false);
  }

  private duckEngine(): void {
    if (this.ctx && this.engine) this.engine.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
  }

  private playAudio(audio: HTMLAudioElement, label: string, volume: number): void {
    audio.volume = this.settings.muted ? 0 : this.settings.master * volume;
    audio.currentTime = 0;
    void audio.play().catch((error: unknown) => {
      console.warn(`[Tesla Surfers] Could not play ${label}.`, error);
    });
  }

  private createAudio(path: string): HTMLAudioElement {
    const audio = new Audio(`${import.meta.env.BASE_URL}${path}`);
    audio.preload = 'auto';
    return audio;
  }

  private updateAudioVolumes(): void {
    const sfxVolume = this.settings.muted ? 0 : this.settings.master * this.settings.sfx;
    this.hornAudio.volume = sfxVolume;
    this.specialDialogue.volume = sfxVolume;
    if (this.currentMusic) {
      const menuVolume = this.currentMusicType === 'menu' ? CONFIG.audio.menuMusicVolume : 1;
      this.currentMusic.volume = this.settings.muted ? 0 : this.settings.master * this.settings.music * menuVolume;
    }
  }

  private playRandom(sounds: readonly (() => void)[]): void {
    sounds[Math.floor(Math.random() * sounds.length)]();
  }

  private playRandomAudio(sounds: readonly HTMLAudioElement[], label: string): void {
    if (sounds.length === 0) return;
    this.playAudio(sounds[Math.floor(Math.random() * sounds.length)], label, this.settings.sfx);
  }

  private setWind(on: boolean): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfx) return;
    if (!this.wind) {
      const src = ctx.createBufferSource();
      src.buffer = this.getNoise();
      src.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 1200;
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      src.connect(band).connect(gain).connect(this.sfx);
      src.start();
      this.wind = { src, gain };
    }
    this.wind.gain.gain.setTargetAtTime(on ? 0.18 : 0.0001, ctx.currentTime, 0.1);
  }

  // ---- helpers ---------------------------------------------------------
  private getNoise(): AudioBuffer {
    const ctx = this.ctx!;
    if (!this.noiseBuf) {
      const len = ctx.sampleRate * 1;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    }
    return this.noiseBuf;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfx || this.voices > 14) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(clamp(vol, 0.0002, 1), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.03);
    this.voices++;
    osc.onended = () => {
      this.voices--;
      g.disconnect();
    };
  }

  private noise(dur: number, vol: number, filterFreq: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfx || this.voices > 14) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.getNoise();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(clamp(vol, 0.0002, 1), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t);
    src.stop(t + dur + 0.03);
    this.voices++;
    src.onended = () => {
      this.voices--;
      g.disconnect();
    };
  }
}
