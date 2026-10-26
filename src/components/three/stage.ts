import {
  ACESFilmicToneMapping,
  HalfFloatType,
  type Material,
  type Mesh,
  type Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  type Texture,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** What every scene module exports. `mount` builds the scene on the canvas and hands back controls. */
export interface SceneHandle {
  setActive(active: boolean): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export interface MountOptions {
  /** Called once, after the first frame is on screen (the drawn poster then fades out). */
  onFirstFrame: () => void;
}

export type FrameFn = (dt: number, t: number) => void;

/**
 * The soft studio lighting the glossy scenes reflect. PMREMGenerator renders it synchronously, so
 * its heaviest shaders (the room's standard materials) are first compiled in the background with
 * the settings PMREM renders them with: into a linear render target, without tone mapping.
 */
async function buildEnvironment(renderer: WebGLRenderer): Promise<Texture> {
  const room = new RoomEnvironment();
  const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType });
  renderer.setRenderTarget(target);
  const ready = renderer.compileAsync(room, new PerspectiveCamera(90, 1, 0.1, 100));
  renderer.setRenderTarget(null);
  await ready.catch(() => undefined);
  target.dispose();
  const pmrem = new PMREMGenerator(renderer);
  const texture = pmrem.fromScene(room, 0.04).texture;
  pmrem.dispose();
  return texture;
}

/**
 * A renderer, scene, camera and a render loop that only runs while the canvas is on screen.
 * Time is clamped so a tab coming back from the background does not jump. The shaders compile in
 * the background before the first frame (KHR_parallel_shader_compile, used by compileAsync):
 * compiling them on first draw froze the page for up to half a second while it scrolled, most of
 * all on Windows. The drawn poster stays up until then.
 */
export function createStage(
  canvas: HTMLCanvasElement,
  { fov = 35, dprMax = 2, environment = false, onFirstFrame }: { fov?: number; dprMax?: number; environment?: boolean; onFirstFrame?: () => void },
) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprMax));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(fov, 1, 0.1, 5000);

  let envTexture: Texture | null = null;

  const frames: FrameFn[] = [];
  const resizers: ((w: number, h: number) => void)[] = [];
  let raf = 0;
  let active = false;
  let last = 0;
  let elapsed = 0;
  let announced = false;
  let width = 0;
  let height = 0;
  let compile: "waiting" | "running" | "done" = "waiting";
  let disposed = false;

  // Before the first frame: the lighting (it changes the shaders), then every shader in the scene.
  const prepare = async () => {
    if (environment) {
      const texture = await buildEnvironment(renderer);
      if (disposed) {
        texture.dispose();
        return;
      }
      envTexture = texture;
      scene.environment = texture;
    }
    await renderer.compileAsync(scene, camera);
  };

  const draw = () => {
    if (compile !== "done") {
      if (compile === "waiting") {
        compile = "running";
        prepare()
          .catch(() => undefined)
          .then(() => {
            compile = "done";
            if (!disposed && !active) draw();
          });
      }
      return;
    }
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
      disposed = true;
      cancelAnimationFrame(raf);
      disposeTree(scene);
      envTexture?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

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
