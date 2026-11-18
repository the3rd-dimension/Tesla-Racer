import * as THREE from 'three';
import { CONFIG } from '../config/gameConfig';

export interface MirrorRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Owns the WebGL renderer, scene, lights, main camera and the rear-view camera.
 * Rear view = second render pass into a scissored viewport, with the scene
 * mirrored on X (scale.x = -1) so left/right behave like a real mirror.
 */
export class GameRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly rearCamera: THREE.PerspectiveCamera;
  mirrorRect: MirrorRect = { left: 0, top: 0, width: 0, height: 0 };
  onResize: ((rect: MirrorRect, aspect: number) => void) | null = null;
  onContextLost: (() => void) | null = null;
  onContextRestored: (() => void) | null = null;

  private width = 1;
  private height = 1;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';

    const sky = 0x9fd8ff;
    this.scene.background = new THREE.Color(sky);
    this.scene.fog = new THREE.Fog(sky, CONFIG.camera.fogNear, CONFIG.camera.fogFar);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.0));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(-30, 60, 20);
    this.scene.add(sun);

    this.camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, CONFIG.camera.near, CONFIG.camera.far);
    this.rearCamera = new THREE.PerspectiveCamera(CONFIG.mirror.fov, 1 / CONFIG.mirror.aspect, 0.1, 120);

    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', this.resize);
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.onContextLost?.();
    });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => this.onContextRestored?.());
    this.resize();
  }

  get aspect(): number {
    return this.width / this.height;
  }

  readonly resize = (): void => {
    const w = Math.max(1, this.container.clientWidth || window.innerWidth);
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    const mw = Math.min(CONFIG.mirror.widthPx, w * CONFIG.mirror.maxWidthFraction);
    const mh = mw * CONFIG.mirror.aspect;
    this.mirrorRect = { left: (w - mw) / 2, top: CONFIG.mirror.topPx, width: mw, height: mh };
    this.rearCamera.aspect = mw / mh;
    this.rearCamera.updateProjectionMatrix();
    this.onResize?.(this.mirrorRect, w / h);
  };

  render(playerX: number, showMirror: boolean): void {
    const r = this.renderer;
    r.setViewport(0, 0, this.width, this.height);
    r.setScissorTest(false);
    r.render(this.scene, this.camera);

    if (!showMirror || !CONFIG.mirror.enabled) return;
    const m = this.mirrorRect;
    const y = this.height - m.top - m.height;
    const m_ = CONFIG.mirror;

    // Mirror the world: flip X on the scene root and the camera's X position.
    this.scene.scale.x = -1;
    this.rearCamera.position.set(-playerX, m_.height, m_.offsetZ);
    this.rearCamera.lookAt(-playerX, m_.height - 0.2, 60);

    r.setViewport(m.left, y, m.width, m.height);
    r.setScissor(m.left, y, m.width, m.height);
    r.setScissorTest(true);
    r.render(this.scene, this.rearCamera);
    r.setScissorTest(false);
    r.setViewport(0, 0, this.width, this.height);
    this.scene.scale.x = 1;
  }
}
