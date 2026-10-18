import {
  ACESFilmicToneMapping,
  type Material,
  type Mesh,
  type Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  type Texture,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** What every scene module exports. `mount` builds the scene on the canvas and hands back controls. */
export interface SceneHandle {
  setActive(active: boolean): void;
  resize(width: number, height: number): void;
  dispose(): void;
  /** Step the scene forward by `seconds` at 60 fps and draw once. For deterministic visual checks. */
  advance?(seconds: number): void;
}

export interface MountOptions {
  /** Called once, after the first frame is on screen (the drawn poster then fades out). */
  onFirstFrame: () => void;
}

export type FrameFn = (dt: number, t: number) => void;

/**
 * A renderer, scene, camera and a render loop that only runs while the canvas is on screen.
 * Time is clamped so a tab coming back from the background does not jump.
 */
export function createStage(
  canvas: HTMLCanvasElement,
  { fov = 35, dprMax = 2, environment = false, onFirstFrame }: { fov?: number; dprMax?: number; environment?: boolean; onFirstFrame?: () => void },
) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprMax));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(fov, 1, 0.1, 5000);

  let envTexture: Texture | null = null;
  if (environment) {
    const pmrem = new PMREMGenerator(renderer);
    envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmrem.dispose();
  }

  const frames: FrameFn[] = [];
  const resizers: ((w: number, h: number) => void)[] = [];
  let raf = 0;
  let active = false;
  let last = 0;
  let elapsed = 0;
  let announced = false;
  let width = 0;
  let height = 0;

  const draw = () => {
    renderer.render(scene, camera);
    if (!announced) {
      announced = true;
      onFirstFrame?.();
    }
  };

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    elapsed += dt;
    for (const f of frames) f(dt, elapsed);
    draw();
  };

  return {
    renderer,
    scene,
    camera,
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    onFrame(f: FrameFn) {
      frames.push(f);
    },
    onResize(f: (w: number, h: number) => void) {
      resizers.push(f);
    },
    setActive(on: boolean) {
      if (on === active) return;
      active = on;
      if (on) {
        last = 0;
        raf = requestAnimationFrame(loop);
      } else {
        cancelAnimationFrame(raf);
      }
    },
    advance(seconds: number) {
      const step = 1 / 60;
      for (let done = 0; done < seconds; done += step) {
        elapsed += step;
        for (const f of frames) f(step, elapsed);
      }
      draw();
    },
    resize(w: number, h: number) {
      if (!w || !h || (w === width && h === height)) return;
      width = w;
      height = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      for (const f of resizers) f(w, h);
      if (!active) draw();
    },
    dispose() {
      cancelAnimationFrame(raf);
      disposeTree(scene);
      envTexture?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

export type Stage = ReturnType<typeof createStage>;

/** Frees every geometry, material and texture under `root`. */
export function disposeTree(root: Object3D) {
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    mesh.geometry?.dispose();
    const mats = (Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []) as Material[];
    for (const m of mats) {
      for (const value of Object.values(m)) {
        if (value && typeof value === "object" && "isTexture" in value) (value as Texture).dispose();
      }
      m.dispose();
    }
  });
}

/** Critically damped spring step (smooth, no overshoot), frame-rate independent. */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
