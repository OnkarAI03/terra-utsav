import {
  CanvasTexture,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  Raycaster,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { createStage, damp, type MountOptions, type SceneHandle } from "../stage";

/**
 * The 60-second challenge brick: a wet clay brick with TU pressed into its frog, turning slowly
 * and dripping. Drag it to turn it yourself (it has weight: it keeps spinning a little, then
 * settles back). Hovering tilts it towards the pointer.
 */

const W = 2.3;
const H = 0.74;
const D = 1.12;

function rnd(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Fired clay: blotchy terracotta with sand specks and pits. `frog` draws the pressed hollow with TU in it. */
function brickCanvas(frog: boolean, height = false) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  const r = rnd(frog ? 7 : 3);
  ctx.fillStyle = height ? "#808080" : "#b4532a";
  ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 260; i++) {
    const x = r() * c.width;
    const y = r() * c.height;
    const rad = 20 + r() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const tone = r() < 0.5 ? (height ? "rgba(90,90,90,0.25)" : "rgba(130,48,22,0.35)") : height ? "rgba(160,160,160,0.2)" : "rgba(214,120,72,0.3)";
    g.addColorStop(0, tone);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 2600; i++) {
    const pit = r() < 0.35;
    ctx.fillStyle = pit ? (height ? "rgba(40,40,40,0.7)" : "rgba(70,24,10,0.55)") : height ? "rgba(190,190,190,0.6)" : "rgba(240,190,140,0.45)";
    const s = pit ? 2 + r() * 4 : 1 + r() * 2;
    ctx.beginPath();
    ctx.arc(r() * c.width, r() * c.height, s, 0, Math.PI * 2);
    ctx.fill();
  }
  if (frog) {
    const fx = c.width * 0.16;
    const fy = c.height * 0.2;
    const fw = c.width * 0.68;
    const fh = c.height * 0.6;
    ctx.fillStyle = height ? "rgba(20,20,20,0.85)" : "rgba(90,30,12,0.55)";
    ctx.beginPath();
    ctx.roundRect(fx, fy, fw, fh, 40);
    ctx.fill();
    ctx.fillStyle = height ? "#d0d0d0" : "rgba(200,104,58,0.95)";
    const face = getComputedStyle(document.documentElement).getPropertyValue("--font-lilita").trim();
    ctx.font = `${Math.round(fh * 0.62)}px ${face ? `${face}, ` : ""}"Arial Rounded MT Bold", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("TU", c.width / 2, c.height / 2 + fh * 0.04);
  }
  const t = new CanvasTexture(c);
  if (!height) t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.6)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

interface Drop {
  mesh: Mesh;
  anchor: Vector3;
  phase: "wait" | "grow" | "fall";
  timer: number;
  wait: number;
  vy: number;
}

export function mount(canvas: HTMLCanvasElement, { onFirstFrame }: MountOptions): SceneHandle {
  const stage = createStage(canvas, { fov: 30, dprMax: 2, environment: true, onFirstFrame });
  const { scene, camera } = stage;
  scene.environmentIntensity = 0.55;

  scene.add(new HemisphereLight("#ffe1c4", "#2a0b10", 0.9));
  const key = new DirectionalLight("#fff0dc", 2.4);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const rim = new DirectionalLight("#ffb07a", 1.6);
  rim.position.set(4, 2, -3);
  scene.add(rim);

  const side = brickCanvas(false);
  const sideBump = brickCanvas(false, true);
  const top = brickCanvas(true);
  const topBump = brickCanvas(true, true);
  const wet = { roughness: 0.6, clearcoat: 1, clearcoatRoughness: 0.14, bumpScale: 1.4, color: "#e8cfc4" };
  const sideMat = new MeshPhysicalMaterial({ map: side, bumpMap: sideBump, ...wet });
  const topMat = new MeshPhysicalMaterial({ map: top, bumpMap: topBump, ...wet });

  // BoxGeometry face order: +x, -x, +y (top), -y, +z, -z.
  const brick = new Mesh(new RoundedBoxGeometry(W, H, D, 5, 0.08), [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
  const holder = new Group();
  holder.add(brick);
  scene.add(holder);

  const shadow = new Mesh(new PlaneGeometry(3.0, 1.5), new MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.05;
  scene.add(shadow);

  // Drips from the underside edges.
  const dropGeo = new SphereGeometry(0.06, 16, 12);
  // Clear water: dark like the night behind it, with a bright skin where it catches the light.
  const dropMat = new MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: 0.03,
    transmission: 1,
    thickness: 0.35,
    ior: 1.33,
    attenuationColor: "#9cc7ff",
    attenuationDistance: 0.6,
    specularIntensity: 1,
    envMapIntensity: 0.55,
  });
  const r = rnd(11);
  const drops: Drop[] = Array.from({ length: 7 }, (_, i) => {
    const mesh = new Mesh(dropGeo, dropMat);
    mesh.visible = false;
    scene.add(mesh); // drops fall in world space, straight down, whatever the brick is doing
    const onFront = i % 2 === 0;
    const anchor = new Vector3((r() - 0.5) * (W - 0.3), -H / 2 - 0.02, onFront ? D / 2 - 0.06 : (r() - 0.5) * (D - 0.2));
    return { mesh, anchor, phase: "wait", timer: 0, wait: 0.3 + r() * 2.4, vy: 0 };
  });

  // Turning: idle sway plus whatever the visitor's drag adds, with momentum.
  let yaw = 0;
  let pitch = 0;
  let velYaw = 0;
  let velPitch = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let lastT = 0;
  let manual = 10; // seconds since the last drag; the idle sway fades back in
  const lean = new Vector2(0, 0);
  const pointer = new Vector2(0, 0);
  const ray = new Raycaster();
  const clampPitch = (v: number) => Math.max(-0.7, Math.min(0.7, v));

  const hit = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    return ray.intersectObject(brick, false).length > 0;
  };
  const onDown = (e: PointerEvent) => {
    if (!hit(e)) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = e.timeStamp;
    velYaw = velPitch = 0;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  };
  const onMove = (e: PointerEvent) => {
    if (dragging) {
      const dts = Math.max(4, e.timeStamp - lastT) / 1000;
      const dYaw = (e.clientX - lastX) * 0.011;
      const dPitch = (e.clientY - lastY) * 0.008;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = e.timeStamp;
      yaw += dYaw;
      pitch = clampPitch(pitch + dPitch);
      velYaw = Math.max(-12, Math.min(12, dYaw / dts));
      velPitch = Math.max(-6, Math.min(6, dPitch / dts));
      manual = 0;
      return;
    }
    canvas.style.cursor = hit(e) ? "grab" : "";
  };
  const onUp = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    // A pause before letting go means no flick.
    if (e.timeStamp - lastT > 80) velYaw = velPitch = 0;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = "grab";
  };
  const onLeave = () => {
    if (!dragging) pointer.set(0, 0);
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);

  const look = new Vector3(0, 0.45, 0);
  stage.onFrame((dt, t) => {
    manual += dt;
    if (!dragging) {
      // Momentum first, then a slow settle back to the idle pose.
      yaw += velYaw * dt;
      pitch = clampPitch(pitch + velPitch * dt);
      velYaw = damp(velYaw, 0, 2.2, dt);
      velPitch = damp(velPitch, 0, 3.5, dt);
      const settle = Math.min(1, Math.max(0, (manual - 1.4) / 2));
      const idleYaw = Math.sin(t * 0.35) * 0.55 - 0.35;
      // Return by the shortest way round.
      const nearest = idleYaw + Math.round((yaw - idleYaw) / (Math.PI * 2)) * Math.PI * 2;
      yaw = damp(yaw, nearest, 1.6 * settle, dt);
      pitch = damp(pitch, Math.sin(t * 0.5) * 0.08, 2 * settle, dt);
    }
    lean.x = damp(lean.x, dragging ? 0 : pointer.x, 4, dt);
    lean.y = damp(lean.y, dragging ? 0 : pointer.y, 4, dt);
    holder.rotation.set(pitch - lean.y * 0.12, yaw + lean.x * 0.25, Math.sin(t * 0.7) * 0.03);
    const bob = Math.sin(t * 1.9) * 0.06;
    holder.position.y = bob;
    shadow.scale.setScalar(1 - bob * 0.8);
    (shadow.material as MeshBasicMaterial).opacity = 0.9 - bob * 2;

    camera.position.set(0, 2.2, 6.1);
    camera.lookAt(look);

    for (const d of drops) {
      d.timer += dt;
      if (d.phase === "wait" && d.timer > d.wait) {
        d.phase = "grow";
        d.timer = 0;
        d.mesh.visible = true;
      }
      if (d.phase === "grow") {
        // The drop swells on the brick's underside and moves with it.
        const k = Math.min(1, d.timer / 0.9);
        d.mesh.scale.set(0.3 + 0.7 * k, 0.3 + 1.0 * k, 0.3 + 0.7 * k);
        d.mesh.position.copy(d.anchor).setY(d.anchor.y - 0.04 * k);
        holder.localToWorld(d.mesh.position);
        if (k >= 1) {
          d.phase = "fall";
          d.timer = 0;
          d.vy = 0;
        }
      } else if (d.phase === "fall") {
        d.vy += 9.8 * dt;
        d.mesh.position.y -= d.vy * dt;
        d.mesh.scale.y = 1.3 + Math.min(1.2, d.vy * 0.25);
        if (d.mesh.position.y < -2.2) {
          d.phase = "wait";
          d.timer = 0;
          d.wait = 0.4 + Math.random() * 2.2;
          d.mesh.visible = false;
        }
      }
    }
  });

  return {
    setActive: stage.setActive,
    resize: stage.resize,
    advance: stage.advance,
    dispose() {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.style.cursor = "";
      stage.dispose();
    },
  };
}
