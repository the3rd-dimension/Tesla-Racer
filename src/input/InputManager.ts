import { clamp } from '../core/math';

export type InputMode = 'keyboard' | 'touch';
export type TouchAction = 'left' | 'right' | 'boost' | 'jump';

export interface InputSnapshot {
  /** -1 (left) .. +1 (right), normalised across keyboard and touch. */
  axis: number;
  boost: boolean;
  /** True for exactly one snapshot per jump press. */
  jumpPressed: boolean;
}

const LEFT = ['KeyA', 'ArrowLeft'];
const RIGHT = ['KeyD', 'ArrowRight'];
const BOOST = ['Space', 'ShiftLeft', 'ShiftRight'];
const JUMP = ['KeyW', 'ArrowUp'];
const HORN = ['KeyH'];
const SPECIAL = ['KeyF'];
const PAUSE = ['Escape', 'KeyP'];
const GAME_KEYS = new Set([...LEFT, ...RIGHT, ...BOOST, ...JUMP, ...HORN, ...SPECIAL]);

/**
 * Keyboard + touch input with automatic mode switching.
 * Touch controls report through setTouch(); the mode follows the *last real input*,
 * not the screen width.
 */
export class InputManager {
  mode: InputMode;
  /** Set by the game: true while a run is active (so Space/arrows do not scroll the page). */
  enabled = false;
  onModeChange: ((mode: InputMode) => void) | null = null;
  onPause: (() => void) | null = null;
  onHorn: (() => void) | null = null;
  onSpecial: (() => void) | null = null;
  /** Called on the first real user gesture (audio unlock etc.). */
  onFirstGesture: (() => void) | null = null;

  private readonly keys = new Set<string>();
  private readonly touch: Record<TouchAction, boolean> = { left: false, right: false, boost: false, jump: false };
  private jumpQueued = false;
  private gestured = false;

  constructor() {
    const touchCapable = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    this.mode = touchCapable && coarse ? 'touch' : 'keyboard';

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.releaseAll);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    });
    window.addEventListener(
      'pointerdown',
      (e) => {
        this.gesture();
        if (e.pointerType === 'touch' || e.pointerType === 'pen') this.setMode('touch');
      },
      { capture: true },
    );
  }

  snapshot(): InputSnapshot {
    const left = this.any(LEFT) || this.touch.left;
    const right = this.any(RIGHT) || this.touch.right;
    const axis = clamp((right ? 1 : 0) - (left ? 1 : 0), -1, 1);
    const jumpPressed = this.jumpQueued;
    this.jumpQueued = false;
    return { axis, boost: this.any(BOOST) || this.touch.boost, jumpPressed };
  }

  setTouch(action: TouchAction, down: boolean): void {
    if (action === 'jump') {
      if (down && !this.touch.jump) this.jumpQueued = true;
    }
    this.touch[action] = down;
  }

  /** Clear every pressed state so nothing is ever stuck (blur, pause, mode switch, state change). */
  readonly releaseAll = (): void => {
    this.keys.clear();
    this.releaseTouch();
    this.jumpQueued = false;
  };

  releaseTouch(): void {
    this.touch.left = this.touch.right = this.touch.boost = this.touch.jump = false;
  }

  private setMode(mode: InputMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    if (mode === 'keyboard') this.releaseTouch();
    this.onModeChange?.(mode);
  }

  private any(codes: string[]): boolean {
    for (const c of codes) if (this.keys.has(c)) return true;
    return false;
  }

  private gesture(): void {
    if (this.gestured) return;
    this.gestured = true;
    this.onFirstGesture?.();
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    this.gesture();
    if (e.repeat) {
      if (this.enabled && GAME_KEYS.has(e.code)) e.preventDefault();
      return;
    }
    this.setMode('keyboard');
    if (PAUSE.includes(e.code)) {
      this.onPause?.();
      return;
    }
    if (HORN.includes(e.code)) {
      if (this.enabled) {
        e.preventDefault();
        this.onHorn?.();
      }
      return;
    }
    if (SPECIAL.includes(e.code)) {
      if (this.enabled) {
        e.preventDefault();
        this.onSpecial?.();
      }
      return;
    }
    if (GAME_KEYS.has(e.code)) {
      if (this.enabled) e.preventDefault();
      this.keys.add(e.code);
      if (JUMP.includes(e.code)) this.jumpQueued = true;
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };
}
