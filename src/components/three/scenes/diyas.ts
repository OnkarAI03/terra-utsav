import {
  AdditiveBlending,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Raycaster,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from "three";
import { createStage, damp, type MountOptions, type SceneHandle } from "../stage";

/**
 * "Light up your Diwali": three clay diyas on a rangoli at night. Each flame is a small shader
 * with its own flickering light, so the diyas light the powder around them. The diyas light up one
 * by one when the scene first appears; tap one to blow it out or light it again. The camera
 * drifts gently and leans towards the pointer.
 */

const HUES = {
  terracotta: { base: "#c4622d", dark: "#7f2f14", dots: "#fbefdb", wave: "#ffc93c" },
  maroon: { base: "#a52a45", dark: "#561021", dots: "#fbefdb", wave: "#ffc93c" },
  gold: { base: "#d9a03e", dark: "#8e5a12", dots: "#fff4dc", wave: "#931f33" },
} as const;

type Hue = keyof typeof HUES;

// Profile of the bowl (radius, height): outer wall up to the rim, then the inside back down.
const PROFILE = [
  [0.0, 0.0],
  [0.34, 0.0],
  [0.58, 0.07],
  [0.76, 0.2],
  [0.86, 0.36],
  [0.9, 0.5],
  [0.84, 0.53],
  [0.74, 0.44],
  [0.55, 0.31],
  [0.28, 0.24],
  [0.0, 0.23],
].map(([x, y]) => new Vector2(x, y));

const RIM = 0.53;
const SPOUT_PULL = 0.34;

/** Lathe the bowl, then pinch a spout towards +x like a hand-made diya. */
function bowlGeometry() {
  const g = new LatheGeometry(PROFILE, 72, Math.PI, Math.PI * 2);
  const pos = g.attributes.position;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.z);
    if (r < 1e-4) continue;
    const ang = Math.atan2(v.z, v.x); // 0 = +x
    const w = Math.pow(Math.max(0, Math.cos(ang)), 10);
    const lift = Math.min(1, v.y / RIM);
    const k = 1 + SPOUT_PULL * w * lift * lift;
    pos.setXYZ(i, v.x * k, v.y + 0.08 * w * lift, v.z * (1 - 0.4 * w * lift));
  }
  g.computeVertexNormals();
  return g;
}

/** Clay with a painted band of dots and a wave near the rim (lathe UVs: u around, v along the profile). */
function clayTexture(hue: Hue) {
  const { base, dark, dots, wave } = HUES[hue];
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const H = c.height;
  const yOf = (v: number) => (1 - v) * H;
  const grad = ctx.createLinearGradient(0, yOf(0), 0, yOf(0.5));
  grad.addColorStop(0, dark);
  grad.addColorStop(1, base);
  ctx.fillStyle = grad;
  ctx.fillRect(0, yOf(0.5), c.width, yOf(0) - yOf(0.5));
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, c.width, yOf(0.5));
  // Grain.
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * c.width, Math.random() * H, 2, 2);
  }
  // Painted band.
  ctx.fillStyle = dots;
  for (let i = 0; i < 28; i++) {
    ctx.beginPath();
    ctx.arc(((i + 0.5) / 28) * c.width, yOf(0.35), 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = wave;
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (let x = 0; x <= c.width; x += 4) {
    const y = yOf(0.43) + Math.sin((x / c.width) * Math.PI * 2 * 14) * 6;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A rangoli of powder petals and dots, drawn once onto a texture. */
function rangoliTexture() {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const C = S / 2;
  ctx.translate(C, C);
  const ring = (n: number, r: number, draw: (i: number) => void) => {
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.rotate((i / n) * Math.PI * 2);
      ctx.translate(0, -r);
      draw(i);
      ctx.restore();
    }
  };
  const petal = (len: number, wid: number, fill: string, inner?: string) => {
    ctx.beginPath();
    ctx.moveTo(0, len / 2);
    ctx.quadraticCurveTo(wid, 0, 0, -len / 2);
    ctx.quadraticCurveTo(-wid, 0, 0, len / 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (inner) {
      ctx.beginPath();
      ctx.moveTo(0, len / 4);
      ctx.quadraticCurveTo(wid / 2.2, 0, 0, -len / 4);
      ctx.quadraticCurveTo(-wid / 2.2, 0, 0, len / 4);
      ctx.fillStyle = inner;
      ctx.fill();
    }
  };
  const dot = (r: number, fill: string) => {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  };
  // Ground of the rangoli: a dark disc with a soft edge.
  const base = ctx.createRadialGradient(0, 0, C * 0.2, 0, 0, C);
  base.addColorStop(0, "rgba(58,15,23,1)");
  base.addColorStop(0.86, "rgba(42,11,16,1)");
  base.addColorStop(1, "rgba(30,7,9,0)");
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.arc(0, 0, C, 0, Math.PI * 2);
  ctx.fill();

  ring(48, C * 0.9, (i) => dot(i % 2 ? 6 : 9, i % 2 ? "#fbefdb" : "#ffc93c"));
  ring(24, C * 0.78, (i) => petal(92, 34, i % 2 ? "#f28c28" : "#ffc93c", "#c4561a"));
  ring(36, C * 0.64, (i) => dot(7, i % 3 === 0 ? "#fbefdb" : "#1fa5a0"));
  ring(16, C * 0.52, () => petal(120, 50, "#e0457b", "#ffc93c"));
  ring(16, C * 0.52, () => dot(6, "#fbefdb"));
  ring(32, C * 0.36, (i) => dot(i % 2 ? 5 : 8, i % 2 ? "#ffc93c" : "#e0457b"));
  ring(8, C * 0.22, () => petal(70, 34, "#1fa5a0", "#fbefdb"));
  dot(C * 0.1, "#ffc93c");
  dot(C * 0.06, "#931f33");

  // Powder grain.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < 9000; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * C * 0.95;
    ctx.fillStyle = `rgba(${Math.random() < 0.5 ? "255,240,220" : "0,0,0"},${Math.random() * 0.12})`;
    ctx.fillRect(C + Math.cos(a) * r, C + Math.sin(a) * r, 2, 2);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,236,190,1)");
  g.addColorStop(0.3, "rgba(255,170,70,0.5)");
  g.addColorStop(1, "rgba(255,120,20,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

const FLAME_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// A teardrop flame: white-hot low in the core, yellow, then orange at the edge, blue at the root.
const FLAME_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uOn;
  uniform float uSeed;
  varying vec2 vUv;
  void main() {
    float y = clamp((vUv.y - 0.06) / 0.9, 0.0, 1.0);
    float sway = (sin(uTime * 9.0 + uSeed) * 0.5 + sin(uTime * 15.3 + uSeed * 2.0) * 0.3) * 0.06 * y * y;
    float x = (vUv.x - 0.5 - sway) * 2.0;
    float width = 0.46 * pow(sin(3.14159 * pow(y, 0.6)), 1.15) * (1.0 - 0.2 * y);
    float d = abs(x) / max(width, 0.001);
    float shape = smoothstep(1.0, 0.55, d) * smoothstep(0.0, 0.06, vUv.y - 0.04);
    vec3 col = mix(vec3(1.0, 0.42, 0.06), vec3(1.0, 0.82, 0.36), smoothstep(0.95, 0.25, d));
    col = mix(col, vec3(1.0, 0.98, 0.88), smoothstep(0.5, 0.0, d) * smoothstep(0.65, 0.12, y));
    col = mix(col, vec3(0.35, 0.45, 1.0), smoothstep(0.14, 0.0, y) * 0.55);
    float a = shape * uOn;
    gl_FragColor = vec4(col * a * 1.6, a);
  }
`;

interface Diya {
  group: Group;
  bowl: Mesh;
  flame: Mesh;
  glow: Sprite;
  light: PointLight;
  on: number;
  target: number;
  lift: number;
  seed: number;
  uniforms: { uTime: { value: number }; uOn: { value: number }; uSeed: { value: number } };
}

export function mount(canvas: HTMLCanvasElement, { onFirstFrame }: MountOptions): SceneHandle {
  const stage = createStage(canvas, { fov: 30, dprMax: 2, onFirstFrame });
  const { scene, camera } = stage;

  scene.add(new HemisphereLight("#ffd9a8", "#1e0709", 0.5));
  const moon = new DirectionalLight("#b9c4ff", 0.3);
  moon.position.set(-2, 4, 3);
  scene.add(moon);
  // A low warm fill from the viewer's side, so the painted bands read.
  const fill = new DirectionalLight("#ffcf9e", 0.45);
  fill.position.set(0, 2.5, 6);
  scene.add(fill);

  const rangoli = new Mesh(
    new CircleGeometry(2.35, 96),
    new MeshStandardMaterial({ map: rangoliTexture(), roughness: 0.95, transparent: true }),
  );
  rangoli.rotation.x = -Math.PI / 2;
  scene.add(rangoli);

  const bowl = bowlGeometry();
  const oil = new CircleGeometry(0.6, 48);
  const wick = new CylinderGeometry(0.035, 0.042, 0.32, 8);
  const wickTip = new SphereGeometry(0.048, 10, 8);
  const flameGeo = new PlaneGeometry(0.62, 1.16);
  flameGeo.translate(0, 0.58, 0);
  const glowTex = glowTexture();
  const oilMat = new MeshStandardMaterial({ color: "#b8862a", roughness: 0.1, metalness: 0.3, emissive: "#6b3c0c", emissiveIntensity: 0.08 });
  const wickMat = new MeshStandardMaterial({ color: "#efe0bf", roughness: 0.9 });
  const charMat = new MeshStandardMaterial({ color: "#2b140d", roughness: 1 });

  const layout: { hue: Hue; x: number; z: number; scale: number; turn: number }[] = [
    { hue: "maroon", x: -1.22, z: 0.45, scale: 0.58, turn: 0.35 },
    { hue: "terracotta", x: 0, z: -0.15, scale: 0.72, turn: -0.5 },
    { hue: "gold", x: 1.2, z: 0.5, scale: 0.58, turn: -1.05 },
  ];

  const tipX = 0.9 * (1 + SPOUT_PULL) - 0.1;
  const diyas: Diya[] = layout.map((d, i) => {
    const group = new Group();
    group.position.set(d.x, 0, d.z);
    group.scale.setScalar(d.scale);
    group.rotation.y = d.turn;

    const clay = clayTexture(d.hue);
    const body = new Mesh(bowl, new MeshStandardMaterial({ map: clay, bumpMap: clay, bumpScale: 0.6, roughness: 0.9 }));
    group.add(body);
    const oilMesh = new Mesh(oil, oilMat);
    oilMesh.rotation.x = -Math.PI / 2;
    oilMesh.position.y = 0.38;
    group.add(oilMesh);

    const w = new Mesh(wick, wickMat);
    w.position.set(tipX - 0.1, 0.55, 0);
    w.rotation.z = -0.85;
    group.add(w);
    const charred = new Mesh(wickTip, charMat);
    charred.position.set(tipX + 0.01, 0.65, 0);
    group.add(charred);

    const uniforms = { uTime: { value: 0 }, uOn: { value: 0 }, uSeed: { value: i * 2.17 } };
    const flame = new Mesh(
      flameGeo,
      new ShaderMaterial({ uniforms, vertexShader: FLAME_VERT, fragmentShader: FLAME_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending }),
    );
    flame.position.set(tipX + 0.01, 0.6, 0);
    group.add(flame);

    const glow = new Sprite(new SpriteMaterial({ map: glowTex, color: "#ffc77a", blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    glow.position.set(tipX, 1.05, 0);
    glow.scale.setScalar(3.1);
    group.add(glow);

    const light = new PointLight("#ff9d4d", 0, 7, 1.5);
    light.position.set(tipX, 1.1, 0);
    group.add(light);

    scene.add(group);
    return { group, bowl: body, flame, glow, light, on: 0, target: 0, lift: 0, seed: i * 2.17, uniforms };
  });

  // Light them one by one the first time the scene is on screen (scene time, so it pauses off screen).
  const INTRO = [
    { idx: 1, at: 0.35 },
    { idx: 0, at: 0.87 },
    { idx: 2, at: 1.39 },
  ];
  let introNext = 0;
  const intro = (t: number) => {
    while (introNext < INTRO.length && t >= INTRO[introNext].at) {
      diyas[INTRO[introNext].idx].target = 1;
      introNext++;
    }
  };

  // Pointer: lean the camera, hover lifts a diya, tap toggles it.
  const pointer = new Vector2(0, 0);
  const lean = new Vector2(0, 0);
  const ray = new Raycaster();
  let hovered: Diya | null = null;
  const pick = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(diyas.map((d) => d.bowl), false)[0];
    return hit ? (diyas.find((d) => d.bowl === hit.object) ?? null) : null;
  };
  const onMove = (e: PointerEvent) => {
    hovered = pick(e);
    canvas.style.cursor = hovered ? "pointer" : "";
  };
  const onLeave = () => {
    hovered = null;
    pointer.set(0, 0);
    canvas.style.cursor = "";
  };
  const onTap = (e: PointerEvent) => {
    const d = pick(e);
    if (d) d.target = d.target > 0.5 ? 0 : 1;
  };
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointerup", onTap);

  const look = new Vector3(0, 0.3, 0.55);
  stage.onResize((w, h) => {
    // Pull back on tall or narrow canvases so all three diyas stay in frame.
    camera.userData.distance = w / h < 0.95 ? 9.4 : 8.2;
  });

  stage.onFrame((dt, t) => {
    intro(t);
    lean.x = damp(lean.x, pointer.x, 3, dt);
    lean.y = damp(lean.y, pointer.y, 3, dt);
    const dist = (camera.userData.distance as number | undefined) ?? 8.2;
    const yaw = Math.sin(t * 0.16) * 0.1 + lean.x * 0.12;
    const pitch = 0.52 + lean.y * 0.05;
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(look);

    for (const d of diyas) {
      d.on = damp(d.on, d.target, d.target > d.on ? 3.2 : 5, dt);
      d.lift = damp(d.lift, hovered === d ? 1 : 0, 10, dt);
      d.group.position.y = d.lift * 0.06;
      const flick = 0.82 + Math.sin(t * 13.1 + d.seed) * 0.08 + Math.sin(t * 7.7 + d.seed * 3) * 0.1;
      d.uniforms.uTime.value = t;
      d.uniforms.uOn.value = d.on;
      d.flame.scale.set(0.9 + flick * 0.1, (0.25 + 0.75 * d.on) * (0.92 + flick * 0.1), 1);
      // Keep the flame card upright and facing the camera.
      const wp = d.flame.getWorldPosition(new Vector3());
      d.flame.lookAt(camera.position.x, wp.y, camera.position.z);
      d.flame.rotation.x = 0;
      (d.glow.material as SpriteMaterial).opacity = 0.85 * d.on * flick;
      d.light.intensity = 6 * d.on * flick;
    }
  });

  return {
    setActive: stage.setActive,
    resize: stage.resize,
    dispose() {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerup", onTap);
      canvas.style.cursor = "";
      stage.dispose();
    },
  };
}
