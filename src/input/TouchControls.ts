import type { InputManager, TouchAction } from './InputManager';

/**
 * On-screen buttons. Each button tracks its own pointers (multi-touch safe) and
 * always releases on up / cancel / lost-capture, so a control can never stick.
 */
export class TouchControls {
  private readonly root: HTMLElement;
  private readonly jumpBtn: HTMLElement;
  private readonly pointers = new Map<HTMLElement, Set<number>>();

  constructor(private readonly input: InputManager) {
    this.root = document.getElementById('touch-controls') as HTMLElement;
    this.jumpBtn = document.getElementById('touch-jump') as HTMLElement;
    this.root.querySelectorAll<HTMLElement>('[data-action]').forEach((btn) => this.bind(btn));
  }

  private bind(btn: HTMLElement): void {
    const action = btn.dataset.action as TouchAction;
    this.pointers.set(btn, new Set());

    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try {
        btn.setPointerCapture(e.pointerId);
      } catch {
        /* pointer may already be gone */
      }
      this.pointers.get(btn)!.add(e.pointerId);
      btn.classList.add('down');
      this.input.setTouch(action, true);
    });

    const release = (e: PointerEvent): void => {
      const set = this.pointers.get(btn)!;
      set.delete(e.pointerId);
      if (set.size === 0) {
        btn.classList.remove('down');
        this.input.setTouch(action, false);
      }
    };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
    if (!visible) this.releaseAll();
  }

  setJumpAvailable(available: boolean): void {
    this.jumpBtn.hidden = !available;
  }

  releaseAll(): void {
    for (const [btn, set] of this.pointers) {
      set.clear();
      btn.classList.remove('down');
    }
    this.input.releaseTouch();
  }
}
