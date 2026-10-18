import {
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshPhongMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Quaternion,
  Raycaster,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
  BackSide,
  FrontSide,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { createStage, damp, type MountOptions, type SceneHandle } from "../stage";

/**
 * Crack it. Pour it. Devour it. A chocolate bomb on a plate: tap it and hot chocolate pours on
 * top, the upper shell blooms open in eight petals like a lotus, the bowl fills with chocolate and
 * the marshmallows pop up off the brownie. Tap again and it closes. A button outside the canvas
 * does the same for keyboard users (window event "tu:bomb"); the scene reports its state back
 * ("tu:bomb-state").
 */

const PETALS = 8;
const OPEN = 1.8; // radians each petal folds out when fully open: a shallow cup, like a lotus
const UP = new Vector3(0, 1, 0);

function rnd(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Partial spheres map the whole texture onto their own patch. Remap them to the full sphere's
 * UVs, so the drizzle sits on the top of the bomb whichever piece carries it.
 */
function sphereUV(geo: SphereGeometry, phiStart: number, phiLength: number, thetaStart: number, thetaLength: number) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = 1 - uv.getY(i);
    uv.setXY(i, (phiStart + u * phiLength) / (Math.PI * 2), 1 - (thetaStart + v * thetaLength) / Math.PI);
  }
  uv.needsUpdate = true;
  return geo;
}

/** Glossy dark chocolate with white and gold drizzle and sprinkles on the top (sphere UVs: top of image = top of bomb). */
function shellTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, "#4a2312");
  g.addColorStop(0.6, "#3a1a0c");
  g.addColorStop(1, "#2a1208");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  const r = rnd(5);
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(${r() < 0.5 ? "90,45,20" : "20,8,4"},${0.08 + r() * 0.12})`;
    ctx.beginPath();
    ctx.ellipse(r() * c.width, r() * c.height, 10 + r() * 40, 4 + r() * 14, r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Drizzle: whole periods across the width so the eight petals join without a seam.
  const zig = (y: number, amp: number, periods: number, colour: string, width: number) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let x = 0; x <= c.width; x += 2) {
      const yy = y + Math.sin((x / c.width) * Math.PI * 2 * periods) * amp;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  };
  zig(c.height * 0.14, 22, 10, "#f4e2c4", 9);
  zig(c.height * 0.25, 16, 14, "#d99a3c", 6);
  zig(c.height * 0.34, 12, 10, "#f4e2c4", 5);
  // Sprinkles near the top.
  const colours = ["#ffc93c", "#e0457b", "#fbefdb", "#1fa5a0", "#f28c28"];
  for (let i = 0; i < 140; i++) {
    ctx.save();
    ctx.translate(r() * c.width, r() * c.height * 0.28 + 4);
    ctx.rotate(r() * Math.PI);
    ctx.fillStyle = colours[i % colours.length];
    ctx.fillRect(-4, -1.5, 8, 3);
    ctx.restore();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Brownie: dark crumb with lighter flecks. */
function brownieTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#3b1f10";
  ctx.fillRect(0, 0, 256, 256);
  const r = rnd(9);
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = r() < 0.6 ? `rgba(20,8,3,${r() * 0.6})` : `rgba(120,70,40,${r() * 0.5})`;
    ctx.fillRect(r() * 256, r() * 256, 2 + r() * 3, 2 + r() * 3);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

type Phase = "closed" | "pouring" | "open" | "closing";

export function mount(canvas: HTMLCanvasElement, { onFirstFrame }: MountOptions): SceneHandle {
  const stage = createStage(canvas, { fov: 30, dprMax: 2, environment: true, onFirstFrame });
  const { scene, camera } = stage;
  scene.environmentIntensity = 0.7;

  scene.add(new HemisphereLight("#ffe7cc", "#2a0b10", 0.8));
  const key = new DirectionalLight("#fff2e0", 2.6);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const rim = new DirectionalLight("#ffb780", 1.8);
  rim.position.set(3.5, 2.5, -3);
  scene.add(rim);

  const world = new Group();
  scene.add(world);

  // Plate.
  const plateMat = new MeshPhysicalMaterial({ color: "#f4e2c4", roughness: 0.3, clearcoat: 0.6 });
  const plate = new Mesh(new CylinderGeometry(1.85, 1.62, 0.12, 72), plateMat);
  plate.position.y = -0.92;
  world.add(plate);
  const rimRing = new Mesh(new TorusGeometry(1.8, 0.05, 10, 96), plateMat);
  rimRing.rotation.x = Math.PI / 2;
  rimRing.position.y = -0.84;
  world.add(rimRing);

  // Glossy chocolate. A dim environment keeps it brown instead of mirroring the room.
  const chocGloss = new MeshPhysicalMaterial({ color: "#4a2414", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.35 });

  const bomb = new Group();
  bomb.scale.setScalar(0.86);
  bomb.position.y = 0;
  world.add(bomb);

  const shellMat = new MeshPhysicalMaterial({ map: shellTexture(), roughness: 0.34, clearcoat: 0.8, clearcoatRoughness: 0.18, envMapIntensity: 0.6, side: FrontSide });
  const innerMat = new MeshStandardMaterial({ color: "#4e2512", roughness: 0.5, side: BackSide });

  // The bottom half is a bowl that stays put.
  const bowlGeo = sphereUV(new SphereGeometry(1, 64, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  bomb.add(new Mesh(bowlGeo, shellMat), new Mesh(bowlGeo, innerMat));

  // Hot chocolate fills the bowl when it opens.
  // Phong, not PBR: the scene's bright room environment would turn a flat glossy pool grey at this
  // low angle. Phong takes its shine from the lights only, so the pool stays dark chocolate.
  const fill = new Mesh(new CircleGeometry(0.985, 64), new MeshPhongMaterial({ color: "#2a1208", specular: "#6b4a36", shininess: 70 }));
  fill.rotation.x = -Math.PI / 2;
  fill.position.y = -0.62;
  bomb.add(fill);

  // Inside: a brownie with marshmallows.
  const crumb = brownieTexture();
  const brownie = new Mesh(new SphereGeometry(0.56, 40, 28), new MeshStandardMaterial({ map: crumb, bumpMap: crumb, bumpScale: 2, roughness: 0.95 }));
  brownie.position.y = -0.36;
  bomb.add(brownie);
  const mallowGeo = new RoundedBoxGeometry(0.26, 0.26, 0.26, 2, 0.07);
  const mallowMats = [new MeshStandardMaterial({ color: "#fff8ef", roughness: 0.85 }), new MeshStandardMaterial({ color: "#ffd9e6", roughness: 0.85 })];
  const r = rnd(21);
  const mallows = Array.from({ length: 10 }, (_, i) => {
    const m = new Mesh(mallowGeo, mallowMats[i % 3 === 0 ? 1 : 0]);
    const a = (i / 10) * Math.PI * 2 + r() * 0.3;
    const ring = i % 2 ? 0.22 : 0.4;
    const rest = new Vector3(Math.cos(a) * ring, 0.14 + (i % 2 ? 0.1 : 0) + r() * 0.05, Math.sin(a) * ring);
    m.position.copy(rest);
    m.rotation.set(r() * 3, r() * 3, r() * 3);
    m.scale.setScalar(0.001);
    bomb.add(m);
    return { m, rest, pop: 0, vy: 0, show: 0 };
  });

  // The top half: eight petals, each hinged on the equator under its middle.
  const petals = Array.from({ length: PETALS }, (_, i) => {
    const phiStart = (i / PETALS) * Math.PI * 2;
    const phiLen = (Math.PI * 2) / PETALS;
    const mid = phiStart + phiLen / 2;
    const out = new Vector3(-Math.cos(mid), 0, Math.sin(mid)); // SphereGeometry's horizontal direction
    const hinge = out.clone(); // on the equator, radius 1
    const geo = sphereUV(new SphereGeometry(1, 12, 18, phiStart, phiLen, 0, Math.PI / 2), phiStart, phiLen, 0, Math.PI / 2);
    geo.translate(-hinge.x, 0, -hinge.z);
    const pivot = new Group();
    pivot.position.copy(hinge);
    pivot.add(new Mesh(geo, shellMat), new Mesh(geo, innerMat));
    bomb.add(pivot);
    const axis = new Vector3().crossVectors(UP, out).normalize();
    return { pivot, axis, angle: 0, vel: 0, delay: i * 0.035 };
  });

  // The hot chocolate pour.
  const stream = new Mesh(new CylinderGeometry(0.07, 0.085, 1, 16, 1, true), chocGloss);
  stream.geometry.translate(0, -0.5, 0); // hangs down from its top
  const streamTop = 3.6;
  stream.position.y = streamTop;
  stream.visible = false;
  world.add(stream);

  let phase: Phase = "closed";
  let phaseT = 0;
  let fillTarget = 0;

  const report = () => window.dispatchEvent(new CustomEvent("tu:bomb-state", { detail: phase === "open" || phase === "pouring" ? "open" : "closed" }));
  const toggle = () => {
    if (phase === "closed") {
      phase = "pouring";
      phaseT = 0;
      stream.visible = true;
    } else if (phase === "open") {
      phase = "closing";
      phaseT = 0;
    } else return;
    report();
  };
  const onCommand = () => toggle();
  window.addEventListener("tu:bomb", onCommand);

  // Pointer: tap the bomb, hover leans it towards you.
  const pointer = new Vector2();
  const lean = new Vector2();
  const ray = new Raycaster();
  let hovering = false;
  const hit = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    return ray.intersectObject(bomb, true).length > 0;
  };
  const onMove = (e: PointerEvent) => {
    hovering = hit(e);
    canvas.style.cursor = hovering ? "pointer" : "";
  };
  const onLeave = () => {
    hovering = false;
    pointer.set(0, 0);
    canvas.style.cursor = "";
  };
  const onTap = (e: PointerEvent) => {
    if (hit(e)) toggle();
  };
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointerup", onTap);

  const q = new Quaternion();
  const look = new Vector3(0, -0.2, 0);
  let squash = 0;

  stage.onFrame((dt, t) => {
    phaseT += dt;
    // Phases: pour until the stream reaches the top, then open; close when asked.
    let target = 0;
    if (phase === "pouring") {
      const reach = Math.min(1, phaseT / 0.45);
      stream.scale.set(1, (streamTop - 0.88) * reach, 1);
      squash = phaseT > 0.45 ? 1 : 0;
      if (phaseT > 0.7) {
        phase = "open";
        phaseT = 0;
        report();
      }
    }
    if (phase === "open") {
      target = OPEN;
      // The stream thins and falls away after the shell opens.
      const fade = Math.min(1, phaseT / 0.35);
      stream.scale.x = stream.scale.z = 1 - fade;
      if (fade >= 1) stream.visible = false;
      fillTarget = 1;
    }
    if (phase === "closing") {
      target = 0;
      fillTarget = 0;
      if (phaseT > 1.1) {
        phase = "closed";
        phaseT = 0;
        report();
      }
    }
    if (phase === "closed") {
      stream.scale.set(1, 0.001, 1);
      stream.visible = false;
    }

    // Petals: springs with a small stagger, so the shell blooms rather than snaps.
    for (const p of petals) {
      const goal = phaseT > p.delay || phase === "closed" ? target : p.angle;
      p.vel += ((goal - p.angle) * 70 - p.vel * 11) * dt;
      p.angle += p.vel * dt;
      q.setFromAxisAngle(p.axis, p.angle);
      p.pivot.quaternion.copy(q);
    }

    // Marshmallows pop up when the shell opens and tuck back in when it closes.
    const open = phase === "open";
    for (const [i, s] of mallows.entries()) {
      s.show = damp(s.show, open || phase === "pouring" ? 1 : 0, open ? 6 : 9, dt);
      if (open && phaseT < 0.05 + i * 0.01) s.vy = 2.6 + (i % 3) * 0.4;
      s.vy -= 9.8 * dt;
      s.pop = Math.max(0, s.pop + s.vy * dt);
      if (s.pop === 0) s.vy = 0;
      s.m.position.set(s.rest.x, s.rest.y + s.pop * 0.35, s.rest.z);
      s.m.scale.setScalar(Math.max(0.001, s.show));
    }

    // The bowl fills from the bottom up.
    const level = damp(fill.userData.level ?? 0, fillTarget, 2.2, dt);
    fill.userData.level = level;
    fill.position.y = -0.62 + level * 0.5;
    fill.scale.setScalar(Math.max(0.001, Math.sqrt(1 - (0.62 - level * 0.5) ** 2) / 0.985));
    fill.visible = level > 0.01;

    // A squash as the pour lands, then the idle turn and the hover lean.
    squash = damp(squash, 0, 8, dt);
    bomb.scale.set(1 + squash * 0.04, 1 - squash * 0.06, 1 + squash * 0.04);
    lean.x = damp(lean.x, pointer.x, 4, dt);
    lean.y = damp(lean.y, pointer.y, 4, dt);
    world.rotation.y = t * 0.18 + lean.x * 0.3;
    world.rotation.x = -lean.y * 0.06;
    bomb.position.y = phase === "closed" ? Math.sin(t * 1.6) * 0.025 + (hovering ? 0.05 : 0) : 0;

    camera.position.set(0, 2.5, 7.6);
    camera.lookAt(look);
  });

  return {
    setActive: stage.setActive,
    resize: stage.resize,
    advance: stage.advance,
    dispose() {
      window.removeEventListener("tu:bomb", onCommand);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerup", onTap);
      canvas.style.cursor = "";
      stage.dispose();
    },
  };
}
