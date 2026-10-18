import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  CurvePath,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  LineCurve3,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import { createStage, type MountOptions, type SceneHandle } from "../stage";

/**
 * Akash kandils: the paper star lanterns hung outside homes in Maharashtra at Diwali. Each one is
 * a faceted paper star lit from inside, on a string from the marigold toran, turning and swaying
 * in the evening air. Moving the pointer past them sets them swinging.
 *
 * Coordinates are CSS pixels (1 unit = 1px on the z = 0 plane), laid out with the same maths as
 * the toran SVG in FestivalLights (viewBox 1440 x 240, preserveAspectRatio xMidYMin slice), so
 * the strings start exactly on the garland.
 */

// Two papers per lantern, alternating facet by facet, like the ones sold in Pune's markets.
const KANDILS = [
  { vx: 60, len: 62, size: 40, paper: ["#931f33", "#ffb02e"], trim: "#ffc93c", tassel: ["#ffc93c", "#e0457b"] },
  { vx: 300, len: 92, size: 46, paper: ["#f28c28", "#931f33"], trim: "#ffc93c", tassel: ["#e0457b", "#ffc93c"] },
  { vx: 1150, len: 84, size: 44, paper: ["#e0457b", "#ffc93c"], trim: "#931f33", tassel: ["#ffc93c", "#931f33"] },
  { vx: 1390, len: 58, size: 38, paper: ["#ffb02e", "#ae2a40"], trim: "#ffc93c", tassel: ["#e0457b", "#ffc93c"] },
];

const toranY = (vx: number) => 10 + Math.sin((vx / 1440) * Math.PI) * 34;

/** Star outline: 10 points, outer radius 1, starting at the top. */
function outline(inner = 0.46) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? inner : 1;
    return new Vector3(Math.cos(a) * r, Math.sin(a) * r, 0);
  });
}

/**
 * A faceted paper star: every outline edge meets a front and a back apex, so each arm has a ridge.
 * Returned as two geometries (the two sides of every ridge) so each can take its own paper.
 */
function starGeometries(depth = 0.55): [BufferGeometry, BufferGeometry] {
  const pts = outline();
  const front = new Vector3(0, 0, depth);
  const back = new Vector3(0, 0, -depth);
  const sides: [number[], number[]] = [[], []];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const out = sides[i % 2];
    out.push(front.x, front.y, front.z, a.x, a.y, a.z, b.x, b.y, b.z);
    out.push(back.x, back.y, back.z, b.x, b.y, b.z, a.x, a.y, a.z);
  }
  return sides.map((pos) => {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }) as [BufferGeometry, BufferGeometry];
}

/** A thin trim tube along the star's outline. */
function trimGeometry() {
  const pts = outline();
  const path = new CurvePath<Vector3>();
  for (let i = 0; i < pts.length; i++) path.add(new LineCurve3(pts[i], pts[(i + 1) % pts.length]));
  return new TubeGeometry(path, 80, 0.055, 6, true);
}

function haloTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,240,200,1)");
  g.addColorStop(0.35, "rgba(255,190,90,0.55)");
  g.addColorStop(1, "rgba(255,150,40,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

export function mount(canvas: HTMLCanvasElement, { onFirstFrame }: MountOptions): SceneHandle {
  const stage = createStage(canvas, { fov: 30, dprMax: 1.5, onFirstFrame });
  const { scene, camera } = stage;

  scene.add(new HemisphereLight("#ffe2b8", "#3a0f17", 1.4));
  const key = new DirectionalLight("#fff1d6", 2.2);
  key.position.set(-0.6, 0.9, 1);
  scene.add(key);

  const [sideA, sideB] = starGeometries();
  const trim = trimGeometry();
  const halo = haloTexture();
  const stringGeo = new CylinderGeometry(1, 1, 1, 6);
  stringGeo.translate(0, -0.5, 0);
  const stringMat = new MeshBasicMaterial({ color: "#1a0c08" });
  const strand = new CylinderGeometry(0.016, 0.022, 1, 5);
  strand.translate(0, -0.5, 0);
  const bead = new SphereGeometry(0.13, 14, 10);

  const lanterns = KANDILS.map((k, i) => {
    const papers = k.paper.map(
      (c) => new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.55, roughness: 0.9, flatShading: true, side: DoubleSide }),
    );
    const trimMat = new MeshStandardMaterial({ color: k.trim, emissive: k.trim, emissiveIntensity: 0.4, roughness: 0.45, metalness: 0.3 });
    const tasselMats = k.tassel.map((c) => new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.6 }));

    const pivot = new Group(); // hangs from the garland and swings
    const string = new Mesh(stringGeo, stringMat);
    pivot.add(string);

    const body = new Group(); // the lantern itself, which turns
    const glow = new Sprite(
      new SpriteMaterial({ map: halo, color: "#ffb347", blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.45 }),
    );
    glow.scale.setScalar(4.2);
    glow.position.z = -0.7;
    body.add(glow);
    body.add(new Mesh(sideA, papers[0]));
    body.add(new Mesh(sideB, papers[1]));
    body.add(new Mesh(trim, trimMat));
    const pom = new Mesh(bead, trimMat);
    pom.position.set(0, 0, 0.56);
    body.add(pom);
    const pomBack = pom.clone();
    pomBack.position.z = -0.56;
    body.add(pomBack);

    // Tassels from the two lower points and the bottom notch.
    const tassels: Group[] = [];
    const lower = (n: number) => [Math.cos(Math.PI / 2 + (n * Math.PI) / 5), Math.sin(Math.PI / 2 + (n * Math.PI) / 5)];
    const anchors: [number, number, number][] = [
      [...lower(4), 0.8] as [number, number, number],
      [0, -0.46, 1.25],
      [...lower(6), 0.8] as [number, number, number],
    ];
    for (const [x, y, length] of anchors) {
      const t = new Group();
      t.position.set(x, y, 0);
      const knot = new Mesh(bead, trimMat);
      knot.scale.setScalar(0.8);
      t.add(knot);
      // A fan of thin paper strands, alternating colours, the middle ones longest.
      for (let s = -3; s <= 3; s++) {
        const m = new Mesh(strand, tasselMats[Math.abs(s) % 2]);
        m.rotation.z = s * 0.06;
        m.rotation.x = (s % 2) * 0.12;
        m.scale.y = length * (1 - Math.abs(s) * 0.07);
        t.add(m);
      }
      body.add(t);
      tassels.push(t);
    }

    pivot.add(body);
    scene.add(pivot);
    return { k, pivot, string, body, glow, papers, tassels, swing: 0, speed: 0, phase: i * 1.7, yaw: i * 2.3 };
  });

  // Lay the lanterns out on the garland for the current canvas size.
  stage.onResize((w, h) => {
    const svgH = Math.max(210, w / 6);
    const s = Math.max(w / 1440, svgH / 240);
    const offset = (w - 1440 * s) / 2;
    const dist = h / (2 * Math.tan((camera.fov * Math.PI) / 360));
    camera.position.set(w / 2, -h / 2, dist);
    camera.lookAt(w / 2, -h / 2, 0);
    camera.near = dist / 10;
    camera.far = dist * 4;
    camera.updateProjectionMatrix();
    for (const l of lanterns) {
      const size = l.k.size * s;
      const len = l.k.len * s;
      l.pivot.position.set(offset + l.k.vx * s, -toranY(l.k.vx) * s, 0);
      l.string.scale.set(1, len, 1);
      l.body.position.set(0, -len - size, 0);
      l.body.scale.setScalar(size);
    }
  });

  // A pointer passing near a lantern pushes it, like a hand brushing past.
  let lastX = 0;
  let lastT = 0;
  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const now = e.timeStamp;
    const dt = Math.max(8, now - lastT) / 1000;
    const vx = lastT ? Math.max(-2500, Math.min(2500, (x - lastX) / dt)) : 0;
    lastX = x;
    lastT = now;
    if (y < 0 || y > rect.height) return;
    for (const l of lanterns) {
      const dx = Math.abs(x - l.pivot.position.x);
      if (dx < 170) l.speed += vx * 0.00011 * (1 - dx / 170);
    }
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  stage.onFrame((dt, t) => {
    for (const l of lanterns) {
      // Damped spring for the push, on top of a slow breeze.
      l.speed += (-l.swing * 10 - l.speed * 1.6) * dt;
      l.swing = Math.max(-0.5, Math.min(0.5, l.swing + l.speed * dt));
      const breeze = Math.sin(t * 1.6 + l.phase) * 0.045;
      l.pivot.rotation.z = breeze + l.swing;
      l.body.rotation.y = Math.sin(t * 0.42 + l.yaw) * 0.6;
      l.body.rotation.x = Math.sin(t * 1.1 + l.phase) * 0.05;
      for (const tassel of l.tassels) tassel.rotation.z = -(breeze + l.swing) * 0.7 + Math.sin(t * 2.4 + l.phase) * 0.06;
      // The light inside flickers a little, like a diya rather than a bulb.
      const flicker = Math.sin(t * 7.3 + l.phase) * 0.5 + Math.sin(t * 11.9 + l.yaw) * 0.5;
      (l.glow.material as SpriteMaterial).opacity = 0.5 + Math.sin(t * 2 + l.phase) * 0.08 + flicker * 0.04;
      for (const m of l.papers) m.emissiveIntensity = 0.55 + flicker * 0.05;
    }
  });

  return {
    setActive: stage.setActive,
    resize: stage.resize,
    advance: stage.advance,
    dispose() {
      window.removeEventListener("pointermove", onMove);
      stage.dispose();
    },
  };
}
