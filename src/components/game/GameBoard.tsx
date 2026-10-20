"use client";

import { Heart, LogOut } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { GameSettings, LevelConfig } from "@/lib/game/config";
import {
  applyTap,
  createLevelState,
  finishLevel,
  generateSchedule,
  isActive,
  positionAt,
  SPOTS,
  type LevelOutcome,
  type Spawn,
} from "@/lib/game/engine";
import { sfx } from "@/lib/game/sound";
import { cn } from "@/lib/cn";
import { loadSprites, type Sprites } from "./sprites";

export interface BoardResult {
  taps: [number, number, number][];
  outcome: LevelOutcome;
  catches: number;
  decoyHits: number;
  aborted: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  text?: string;
}

const BOX_COLOURS = [
  { body: "#931f33", lid: "#ae2a40", ribbon: "#f7d58c" },
  { body: "#d99a3c", lid: "#edb95c", ribbon: "#931f33" },
  { body: "#fbefdb", lid: "#fff8ec", ribbon: "#c4561a" },
];

/** The submit route accepts at most this many raw taps per level (src/lib/game/server.ts). */
const MAX_RAW_TAPS = 600;

const KEYS: Record<string, number> = {
  "7": 0, "8": 1, "9": 2, "4": 3, "5": 4, "6": 5, "1": 6, "2": 7, "3": 8,
  q: 0, w: 1, e: 2, a: 3, s: 4, d: 5, z: 6, x: 7, c: 8,
};

/** The number key for each box, in SPOTS order: laid out like a number pad, 7 8 9 along the top. */
const KEY_LABELS = SPOTS.map((_, i) => Object.keys(KEYS).find((k) => KEYS[k] === i && /^\d$/.test(k)) ?? "");

/** Screen readers hear the time left at these moments only (milliseconds left), never every second. */
const TIME_WARNINGS_MS = [10_000, 5_000];

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

/**
 * The playing field for one level. Draws with Canvas 2D, records every tap with its time, and
 * applies the shared rules for instant feedback. The result it reports is only a local preview;
 * in reward mode the parent sends the raw taps to the server, which decides.
 */
export function GameBoard({
  seed,
  config,
  settings,
  sound,
  reduceMotion,
  rewardMode,
  showKeys = false,
  onKeyboard,
  onFinish,
}: {
  seed: number;
  config: LevelConfig;
  settings: GameSettings;
  sound: boolean;
  reduceMotion: boolean;
  rewardMode: boolean;
  /** Draw the key numbers from the start, even on a touch screen (the player used the keys before). */
  showKeys?: boolean;
  /** Called on the level's first key press that brings the key numbers out. */
  onKeyboard?: () => void;
  onFinish: (result: BoardResult) => void;
}) {
  const schedule = useMemo(() => generateSchedule(seed, config), [seed, config]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const keepPlayingRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const showKeysRef = useRef(showKeys);
  const nextWarningRef = useRef(0);
  const stateRef = useRef(createLevelState(config));
  const tapsRef = useRef<[number, number, number][]>([]);
  const startRef = useRef(0);
  const particles = useRef<Particle[]>([]);
  const flash = useRef(0);
  const shake = useRef(0);
  const finished = useRef(false);
  const spritesRef = useRef<Sprites>({});
  const fontRef = useRef("sans-serif");

  const [size, setSize] = useState(320);
  const [hud, setHud] = useState({ catches: 0, lives: config.lives });
  const [announce, setAnnounce] = useState("");
  const [confirmExit, setConfirmExit] = useState(false);
  const leaveTitleId = useId();

  // Fit a square board to the space available.
  useEffect(() => {
    const fit = () => {
      const w = wrapRef.current?.clientWidth ?? 320;
      const h = window.innerHeight - 200;
      setSize(Math.max(260, Math.min(w, h, 680)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  useEffect(() => {
    void loadSprites().then((s) => (spritesRef.current = s));
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-lilita").trim();
    if (family) fontRef.current = `${family}, sans-serif`;
    // Mouse and keyboard players see which number key taps which box; touch phones keep plain boxes.
    const touch = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
    if (!touch) showKeysRef.current = true;
    // The number keys work straight away, without a click on the board first. The focus never
    // scrolls (the line below does that), and asks for no focus ring on touch screens.
    // (`focusVisible` is newer than TypeScript's DOM types.)
    const focusOptions: FocusOptions & { focusVisible?: boolean } = touch ? { preventScroll: true, focusVisible: false } : { preventScroll: true };
    boardRef.current?.focus(focusOptions);
    // Bring the whole board (HUD included) into view when the level starts.
    wrapRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The parent passes a new onFinish on every render (pressing Sound re-renders it). Keep it in a
  // ref so `finish`, and with it the game loop below, stays the same for the whole level: the loop
  // must never restart mid-level, or the level clock would restart with it.
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const finish = useCallback(
    (aborted: boolean) => {
      if (finished.current) return;
      finished.current = true;
      const st = finishLevel(stateRef.current, config);
      onFinishRef.current({
        taps: tapsRef.current,
        outcome: st.outcome ?? "failed_time",
        catches: st.catches,
        decoyHits: st.decoyHits,
        aborted,
      });
    },
    [config],
  );

  const burst = useCallback(
    (x: number, y: number, colours: string[], count: number, text?: string) => {
      if (reduceMotion) count = Math.min(count, 4);
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const speed = 0.25 + Math.random() * 0.35;
        particles.current.push({
          x,
          y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed - 0.15,
          life: 0,
          max: 600 + Math.random() * 250,
          color: colours[i % colours.length],
          size: 0.008 + Math.random() * 0.008,
        });
      }
      if (text) particles.current.push({ x, y: y - 0.06, vx: 0, vy: -0.12, life: 0, max: 900, color: colours[0], size: 0.06, text });
    },
    [reduceMotion],
  );

  const handleTap = useCallback(
    (x: number, y: number) => {
      if (finished.current || stateRef.current.ended) return;
      // The server accepts up to 600 raw taps; past that a frantic tapper would lose the level.
      if (tapsRef.current.length >= MAX_RAW_TAPS) return;
      const t = Math.round(performance.now() - startRef.current);
      const tap = { t, x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 };
      tapsRef.current.push([tap.t, tap.x, tap.y]);
      const result = applyTap(schedule, stateRef.current, config, settings, tap);
      const st = stateRef.current;

      if (result.type === "catch") {
        const s = schedule.find((sp) => sp.id === result.spawnId)!;
        const p = positionAt(s, t);
        burst(p.x, p.y, ["#ffc93c", "#f28c28", "#fbefdb", "#e0457b"], 16, "+1");
        if (sound) sfx.catch();
        setAnnounce(`Caught! ${st.catches} of ${config.targetCatches}.`);
      } else if (result.type === "decoy") {
        const s = schedule.find((sp) => sp.id === result.spawnId)!;
        burst(s.from.x, s.from.y, ["#ff8a80", "#931f33"], 10, "−1");
        flash.current = 1;
        if (!reduceMotion) shake.current = 1;
        if (sound) sfx.decoy();
        setAnnounce(`That was a snack! ${st.livesLeft} ${st.livesLeft === 1 ? "heart" : "hearts"} left.`);
      } else if (result.type === "miss") {
        particles.current.push({ x, y, vx: 0, vy: 0, life: 0, max: 380, color: "#fbefdb", size: 0.02, text: "ring" });
        if (sound) sfx.miss();
      }
      setHud({ catches: st.catches, lives: st.livesLeft });
    },
    [schedule, config, settings, sound, burst, reduceMotion],
  );

  // The game loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Set once per level (the board remounts for every level), never reset by a re-run.
    if (!startRef.current) startRef.current = performance.now();
    let last = performance.now();
    let raf = 0;
    let endedAt: number | null = null;
    // A warning in the first three seconds would only repeat the level intro.
    const warnings = TIME_WARNINGS_MS.filter((w) => config.durationMs - w >= 3000);

    const frame = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const t = now - startRef.current;
      const st = stateRef.current;

      // Timer bar without re-rendering React.
      if (timerRef.current) timerRef.current.style.transform = `scaleX(${Math.max(0, 1 - t / config.durationMs)})`;

      // The bar is hidden from screen readers, so they hear the time left at a few moments instead.
      // After a sleeping tab skips past several, only the latest is said.
      let warning: number | undefined;
      while (nextWarningRef.current < warnings.length && config.durationMs - t <= warnings[nextWarningRef.current]) {
        warning = warnings[nextWarningRef.current++];
      }
      if (warning !== undefined && !st.ended && t < config.durationMs) setAnnounce(`${warning / 1000} seconds left.`);

      if (st.ended && endedAt === null) endedAt = now;
      if ((endedAt !== null && now - endedAt > 450) || t >= config.durationMs) {
        draw(ctx, t);
        finish(false);
        return;
      }
      draw(ctx, t);
      // advance particles
      particles.current = particles.current.filter((p) => {
        p.life += dt;
        p.x += (p.vx * dt) / 1000;
        p.y += (p.vy * dt) / 1000;
        if (!p.text) p.vy += (0.9 * dt) / 1000;
        return p.life < p.max;
      });
      flash.current = Math.max(0, flash.current - dt / 400);
      shake.current = Math.max(0, shake.current - dt / 300);
      raf = requestAnimationFrame(frame);
    };

    const draw = (c: CanvasRenderingContext2D, t: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const px = canvas.clientWidth * dpr;
      if (canvas.width !== Math.round(px)) {
        canvas.width = Math.round(px);
        canvas.height = Math.round(px);
      }
      const S = canvas.width;
      const sprites = spritesRef.current;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, S, S);
      const shakeX = shake.current ? Math.sin(t / 18) * shake.current * 0.012 * S : 0;
      c.setTransform(1, 0, 0, 1, shakeX, 0);

      // A marigold toran across the top of the stall.
      c.beginPath();
      c.moveTo(0, 0.02 * S);
      c.quadraticCurveTo(0.5 * S, 0.1 * S, S, 0.02 * S);
      c.strokeStyle = "rgba(58, 31, 20, 0.9)";
      c.lineWidth = 0.004 * S;
      c.stroke();
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        const fy = 0.02 + 2 * u * (1 - u) * 0.08;
        if (i % 4 === 2) {
          c.beginPath();
          c.ellipse(u * S, (fy + 0.035) * S, 0.009 * S, 0.022 * S, 0, 0, Math.PI * 2);
          c.fillStyle = "#3f7d3a";
          c.fill();
        }
        c.beginPath();
        c.arc(u * S, fy * S, 0.017 * S, 0, Math.PI * 2);
        c.fillStyle = i % 3 === 0 ? "#ffc93c" : "#f28c28";
        c.fill();
        c.beginPath();
        c.arc(u * S, fy * S, 0.006 * S, 0, Math.PI * 2);
        c.fillStyle = "#c4561a";
        c.fill();
      }

      // Floor glow and rangoli dots under each box.
      for (let i = 0; i < SPOTS.length; i++) {
        const sp = SPOTS[i];
        c.beginPath();
        c.ellipse(sp.x * S, (sp.y + 0.14) * S, 0.13 * S, 0.03 * S, 0, 0, Math.PI * 2);
        c.fillStyle = "rgba(255, 201, 60, 0.10)";
        c.fill();
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          c.beginPath();
          c.arc((sp.x + Math.cos(a) * 0.115) * S, (sp.y + 0.14 + Math.sin(a) * 0.026) * S, 0.0045 * S, 0, Math.PI * 2);
          c.fillStyle = k % 2 ? "#e0457b" : "#ffc93c";
          c.fill();
        }
      }

      // Pop-ups rise out of the boxes; the box is drawn after so it hides their lower half.
      const active = schedule.filter((s) => isActive(s, t) && !stateRef.current.resolved.has(s.id));
      const popsBySpot = new Map<number, Spawn[]>();
      for (const s of active) if (s.motion === "pop" && s.spot !== null) popsBySpot.set(s.spot, [...(popsBySpot.get(s.spot) ?? []), s]);

      for (let i = 0; i < SPOTS.length; i++) {
        const sp = SPOTS[i];
        for (const s of popsBySpot.get(i) ?? []) {
          const age = t - s.appearAt;
          const remain = s.appearAt + s.visibleMs - t;
          const k = reduceMotion ? 1 : easeOut(Math.min(1, age / 140, remain / 140));
          const drop = (1 - k) * 0.16;
          if (s.kind === "cat") {
            const img = sprites.peek;
            const w = 0.22;
            const h = img ? (w * img.height) / img.width : 0.2;
            if (img) c.drawImage(img, (sp.x - w / 2) * S, (sp.y - h * 0.55 + drop) * S, w * S, h * S);
            else drawFallbackCat(c, sp.x * S, (sp.y + drop) * S, 0.08 * S);
          } else {
            const img = s.decoy ? sprites[s.decoy] : undefined;
            const h = 0.13;
            const w = img ? (h * img.width) / img.height : 0.1;
            if (img) c.drawImage(img, (sp.x - w / 2) * S, (sp.y - h * 0.5 + drop) * S, w * S, h * S);
            else {
              c.beginPath();
              c.arc(sp.x * S, (sp.y + drop) * S, 0.05 * S, 0, Math.PI * 2);
              c.fillStyle = "#e0457b";
              c.fill();
            }
          }
        }
        drawGiftBox(c, sp.x, sp.y, S, BOX_COLOURS[i % BOX_COLOURS.length]);
        if (showKeysRef.current) drawKeyLabel(c, sp.x, sp.y, S, KEY_LABELS[i], fontRef.current);
      }

      // Dashing kittens run over everything.
      for (const s of active) {
        if (s.motion !== "dash") continue;
        const p = positionAt(s, t);
        const img = Math.floor(t / 90) % 2 ? sprites.run1 : sprites.run2;
        const w = 0.2;
        const h = img ? (w * img.height) / img.width : 0.17;
        const bob = reduceMotion ? 0 : Math.sin(t / 55) * 0.006;
        c.save();
        const flip = s.to.x < s.from.x;
        c.translate(p.x * S, (p.y + bob) * S);
        if (flip) c.scale(-1, 1);
        if (img) c.drawImage(img, (-w / 2) * S, (-h / 2) * S, w * S, h * S);
        else drawFallbackCat(c, 0, 0, 0.08 * S);
        c.restore();
      }

      // Particles and floating text.
      for (const p of particles.current) {
        const a = 1 - p.life / p.max;
        c.globalAlpha = Math.max(0, a);
        if (p.text === "ring") {
          c.beginPath();
          c.arc(p.x * S, p.y * S, (0.02 + (p.life / p.max) * 0.05) * S, 0, Math.PI * 2);
          c.strokeStyle = p.color;
          c.lineWidth = 0.006 * S;
          c.stroke();
        } else if (p.text) {
          c.font = `${Math.round(p.size * S)}px ${fontRef.current}`;
          c.textAlign = "center";
          c.lineWidth = 0.012 * S;
          c.strokeStyle = "#24120c";
          c.strokeText(p.text, p.x * S, p.y * S);
          c.fillStyle = p.color;
          c.fillText(p.text, p.x * S, p.y * S);
        } else {
          c.beginPath();
          c.arc(p.x * S, p.y * S, p.size * S, 0, Math.PI * 2);
          c.fillStyle = p.color;
          c.fill();
        }
        c.globalAlpha = 1;
      }

      // Red flash when a snack is tapped.
      if (flash.current > 0) {
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.fillStyle = `rgba(174, 42, 64, ${0.28 * flash.current})`;
        c.fillRect(0, 0, S, S);
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [schedule, config, finish, reduceMotion]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    handleTap((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
  };

  // The leave question takes focus, and hands it back to the board so the number keys keep working.
  useEffect(() => {
    if (confirmExit) keepPlayingRef.current?.focus({ preventScroll: true });
  }, [confirmExit]);

  const keepPlaying = () => {
    setConfirmExit(false);
    boardRef.current?.focus({ preventScroll: true });
  };

  const leave = () => {
    setConfirmExit(false);
    finish(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // The leave question covers the board: keys answer it and never tap the boxes underneath.
    if (confirmExit) {
      if (e.key === "Escape") keepPlaying();
      return;
    }
    const idx = KEYS[e.key.toLowerCase()];
    if (idx === undefined) return;
    e.preventDefault();
    // A held key auto-repeats about 30 times a second; only real presses count.
    if (e.repeat) return;
    if (!showKeysRef.current) {
      showKeysRef.current = true;
      onKeyboard?.();
    }
    handleTap(SPOTS[idx].x, SPOTS[idx].y);
  };

  return (
    <div ref={wrapRef} className="w-full">
      <div className="mx-auto" style={{ width: size }}>
        <div className="flex items-center justify-between gap-3 pb-2">
          <div className="min-w-0">
            <p className="font-display text-[1.25rem] leading-none text-cream-100">Level {config.level}</p>
            <p className="truncate text-[0.875rem] font-bold text-gold-300">{config.name}</p>
          </div>
          <div className="flex items-center gap-1" aria-label={`${hud.lives} of ${config.lives} hearts left`} role="img">
            {Array.from({ length: config.lives }, (_, i) => (
              <Heart
                key={i}
                aria-hidden
                className={cn("h-6 w-6 transition-transform duration-200", i < hud.lives ? "fill-danger text-danger" : "scale-90 text-cream-100/40")}
              />
            ))}
          </div>
          <p className="font-display text-[1.35rem] tabular-nums leading-none text-cream-100" aria-label={`${hud.catches} of ${config.targetCatches} caught`}>
            {hud.catches}
            <span className="text-cream-100/70">/{config.targetCatches}</span>
          </p>
          <button
            type="button"
            onClick={() => setConfirmExit(true)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-cream-100/70 text-cream-100 hover:bg-cream-100 hover:text-ink"
            aria-label="Leave this level"
          >
            <LogOut aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-burgundy-800" aria-hidden>
          <div ref={timerRef} className="h-full origin-left rounded-full bg-gold-400" />
        </div>

        <div
          ref={boardRef}
          className="relative overflow-hidden rounded-[26px] bg-[radial-gradient(circle_at_50%_40%,#4f1420_0%,#2a0b10_75%)] shadow-[inset_0_0_0_3px_rgb(237_185_92/0.35)] outline-none focus-visible:ring-4 focus-visible:ring-gold-400"
          style={{ width: size, height: size }}
          role="application"
          aria-label="Game board. Tap Mini whenever it appears. Keyboard: number keys tap the gift boxes, laid out like a number pad: 7, 8 and 9 along the top, 1, 2 and 3 along the bottom."
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            className="block h-full w-full touch-none select-none"
            aria-hidden
          />
          {confirmExit && (
            <div className="absolute inset-0 grid place-items-center bg-night/80 p-6 text-center" role="dialog" aria-labelledby={leaveTitleId}>
              <div className="max-w-xs">
                <p id={leaveTitleId} className="title text-cream-100">
                  Leave this level?
                </p>
                <p className="mt-2 text-[0.98rem] text-cream-100">
                  {rewardMode ? "The clock keeps running. Leaving now ends this reward attempt." : "You can start again any time."}
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  <button ref={keepPlayingRef} type="button" onClick={keepPlaying} className="rounded-full bg-cream-100 px-5 py-3 font-display uppercase text-ink">
                    Keep playing
                  </button>
                  <button type="button" onClick={leave} className="rounded-full border-2 border-cream-100/80 px-5 py-3 font-display uppercase text-cream-100">
                    Leave level
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </div>
    </div>
  );
}

function drawGiftBox(c: CanvasRenderingContext2D, x: number, y: number, S: number, col: { body: string; lid: string; ribbon: string }) {
  const bw = 0.2;
  const bh = 0.1;
  const top = y + 0.04;
  const left = x - bw / 2;
  c.save();
  c.lineWidth = 0.005 * S;
  c.strokeStyle = "#24120c";
  // body
  roundRect(c, left * S, top * S, bw * S, bh * S, 0.012 * S);
  c.fillStyle = col.body;
  c.fill();
  c.stroke();
  // ribbon
  c.fillStyle = col.ribbon;
  c.fillRect((x - 0.012) * S, top * S, 0.024 * S, bh * S);
  // lid
  roundRect(c, (left - 0.008) * S, (top - 0.016) * S, (bw + 0.016) * S, 0.03 * S, 0.008 * S);
  c.fillStyle = col.lid;
  c.fill();
  c.stroke();
  c.fillStyle = col.ribbon;
  c.fillRect((x - 0.012) * S, (top - 0.016) * S, 0.024 * S, 0.03 * S);
  // bow
  for (const dir of [-1, 1]) {
    c.beginPath();
    c.ellipse((x + dir * 0.022) * S, (top - 0.022) * S, 0.022 * S, 0.012 * S, dir * 0.45, 0, Math.PI * 2);
    c.fillStyle = col.ribbon;
    c.fill();
    c.stroke();
  }
  c.beginPath();
  c.arc(x * S, (top - 0.02) * S, 0.009 * S, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.restore();
}

/** The number key that taps this box, small on a dark seal across the ribbon, like a key cap. */
function drawKeyLabel(c: CanvasRenderingContext2D, x: number, y: number, S: number, label: string, font: string) {
  const cy = y + 0.098;
  c.save();
  c.beginPath();
  c.arc(x * S, cy * S, 0.024 * S, 0, Math.PI * 2);
  c.fillStyle = "rgba(36, 18, 12, 0.62)";
  c.fill();
  c.font = `${Math.round(0.03 * S)}px ${font}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = "#fbefdb";
  c.fillText(label, x * S, cy * S);
  c.restore();
}

function drawFallbackCat(c: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.fillStyle = "#fbefdb";
  c.fill();
  c.fillStyle = "#3a1f14";
  c.beginPath();
  c.arc(cx - r * 0.35, cy - r * 0.1, r * 0.12, 0, Math.PI * 2);
  c.arc(cx + r * 0.35, cy - r * 0.1, r * 0.12, 0, Math.PI * 2);
  c.fill();
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
