import './ui/styles.css';
import { Game } from './app/Game';
import { validateAllPatterns } from './traffic/patterns';
import { UI } from './ui/UI';

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

const ui = new UI();

if (!webglAvailable()) {
  ui.showFatal('Your browser or device does not support WebGL, which this game needs. Try a recent version of Chrome, Firefox, Edge or Safari.');
} else {
  try {
    if (import.meta.env.DEV) {
      const bad = validateAllPatterns();
      if (bad.length) console.warn('[Tesla Racer] Invalid traffic patterns (no safe gap):', bad);
    }
    const root = document.getElementById('game-root');
    if (!root) throw new Error('#game-root missing');
    new Game(root, ui).start().catch((err: unknown) => {
      console.error(err);
      ui.showFatal('Something went wrong while loading the game. Please reload the page.');
    });
  } catch (err) {
    console.error(err);
    ui.showFatal('Something went wrong while starting the game. Please reload the page.');
  }
}
