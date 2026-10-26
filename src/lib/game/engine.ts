import type { LevelConfig, GameSettings } from "./config";
import { between, mulberry32, pick } from "./rng";

/**
 * Catch Mini: the rules of play as pure, deterministic functions.
 *
 * The field is a square with coordinates from 0 to 1 on both axes. A level is fully described by
 * (seed, level config): `generateSchedule` turns them into the list of things that appear, when
 * and where. A player's input is only a list of taps (time, x, y). `resolveLevel` replays those
 * taps against the schedule and decides the outcome. The browser uses these functions for instant
 * feedback; the server runs the same functions on the submitted taps and its result is the only
 * one that counts. The client never sends a score or a success flag.
 */

export type Vec = { x: number; y: number };
export type DecoyType = "cupcake" | "chilli" | "nacho" | "chocolate";
export const DECOY_TYPES: DecoyType[] = ["cupcake", "chilli", "nacho", "chocolate"];

export interface Spawn {
  id: number;
  kind: "cat" | "decoy";
  decoy?: DecoyType;
  motion: "pop" | "dash";
  spot: number | null;
  from: Vec;
  to: Vec;
  appearAt: number;
  visibleMs: number;
}

export interface Tap {
  /** Milliseconds since the level clock started. */
  t: number;
  x: number;
  y: number;
}

export type LevelOutcome = "passed" | "failed_time" | "failed_lives";

export type TapResult =
  | { type: "catch"; spawnId: number }
  | { type: "decoy"; spawnId: number }
  | { type: "miss" }
  | { type: "ignored"; reason: "too_fast" | "too_soon" | "over_limit" | "after_end" | "out_of_bounds" };

export interface LevelState {
  catches: number;
  decoyHits: number;
  livesLeft: number;
  resolved: Set<number>;
  lastCountedTapAt: number;
  tapsCounted: number;
  ignored: number;
  tooFast: number;
  ended: boolean;
  outcome: LevelOutcome | null;
  endedAt: number | null;
}

/** Where pop-ups appear: a 3 x 3 grid of bowls on the stall counter. */
export const SPOTS: Vec[] = [0.26, 0.53, 0.8].flatMap((y) => [0.2, 0.5, 0.8].map((x) => ({ x, y })));

const FIRST_SPAWN_MS = 650;
const END_BUFFER_MS = 350;

export function generateSchedule(seed: number, cfg: LevelConfig): Spawn[] {
  const rnd = mulberry32(seed ^ (cfg.level * 0x9e3779b1));
  const spawns: Spawn[] = [];
  const spotFreeAt = new Array<number>(SPOTS.length).fill(0);
  let t = FIRST_SPAWN_MS;
  let id = 0;
  let guard = 0;

  while (t < cfg.durationMs - END_BUFFER_MS && guard++ < 2000) {
    const active = spawns.filter((s) => s.appearAt <= t && t < s.appearAt + s.visibleMs);
    if (active.length >= cfg.maxActive) {
      t = Math.min(...active.map((s) => s.appearAt + s.visibleMs)) + 40;
      continue;
    }

    const isDecoy = rnd() < cfg.decoyChance;
    const isDash = !isDecoy && rnd() < cfg.dashChance;

    if (isDash) {
      const leftToRight = rnd() < 0.5;
      const y0 = between(rnd, 0.2, 0.86);
      const y1 = Math.min(0.88, Math.max(0.18, y0 + between(rnd, -0.16, 0.16)));
      const duration = Math.round(between(rnd, cfg.dashMs[0], cfg.dashMs[1]));
      spawns.push({
        id: id++,
        kind: "cat",
        motion: "dash",
        spot: null,
        from: { x: leftToRight ? -0.06 : 1.06, y: y0 },
        to: { x: leftToRight ? 1.06 : -0.06, y: y1 },
        appearAt: Math.round(t),
        visibleMs: duration,
      });
    } else {
      const free = SPOTS.map((_, i) => i).filter((i) => spotFreeAt[i] <= t);
      if (free.length === 0) {
        t += 80;
        continue;
      }
      const spot = free[pick(rnd, free.length)];
      const duration = Math.round(between(rnd, cfg.visibleMs[0], cfg.visibleMs[1]));
      const decoy = isDecoy ? DECOY_TYPES[pick(rnd, DECOY_TYPES.length)] : undefined;
      spawns.push({
        id: id++,
        kind: isDecoy ? "decoy" : "cat",
        decoy,
        motion: "pop",
        spot,
        from: SPOTS[spot],
        to: SPOTS[spot],
        appearAt: Math.round(t),
        visibleMs: duration,
      });
      spotFreeAt[spot] = t + duration + 220;
    }

    t += between(rnd, cfg.spawnGapMs[0], cfg.spawnGapMs[1]);
  }

  return spawns;
}

export function isActive(s: Spawn, t: number): boolean {
  return t >= s.appearAt && t < s.appearAt + s.visibleMs;
}

export function positionAt(s: Spawn, t: number): Vec {
  if (s.motion === "pop") return s.from;
  const p = Math.min(1, Math.max(0, (t - s.appearAt) / s.visibleMs));
  return { x: s.from.x + (s.to.x - s.from.x) * p, y: s.from.y + (s.to.y - s.from.y) * p };
}

export function createLevelState(cfg: LevelConfig): LevelState {
  return {
    catches: 0,
    decoyHits: 0,
    livesLeft: cfg.lives,
    resolved: new Set(),
    lastCountedTapAt: -Infinity,
    tapsCounted: 0,
    ignored: 0,
    tooFast: 0,
    ended: false,
    outcome: null,
    endedAt: null,
  };
}

/** Find what a tap would hit, nearest first. Pure; does not change state. */
export function hitTest(schedule: Spawn[], state: LevelState, cfg: LevelConfig, tap: Tap): Spawn | null {
  let best: Spawn | null = null;
  let bestD = Infinity;
  for (const s of schedule) {
    if (state.resolved.has(s.id) || !isActive(s, tap.t)) continue;
    const p = positionAt(s, tap.t);
    const d = Math.hypot(p.x - tap.x, p.y - tap.y);
    const r = s.kind === "cat" ? cfg.catRadius : cfg.decoyRadius;
    if (d <= r && (d < bestD || (d === bestD && best !== null && s.appearAt > best.appearAt))) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

/** Apply one tap. Mutates and returns `state` along with what happened. */
export function applyTap(
  schedule: Spawn[],
  state: LevelState,
  cfg: LevelConfig,
  settings: Pick<GameSettings, "minReactionMs" | "minTapGapMs" | "maxTapsPerLevel">,
  tap: Tap,
): TapResult {
  if (state.ended || tap.t > cfg.durationMs) {
    state.ignored++;
    return { type: "ignored", reason: "after_end" };
  }
  if (!Number.isFinite(tap.t) || tap.t < 0 || tap.x < -0.1 || tap.x > 1.1 || tap.y < -0.1 || tap.y > 1.1) {
    state.ignored++;
    return { type: "ignored", reason: "out_of_bounds" };
  }
  if (tap.t - state.lastCountedTapAt < settings.minTapGapMs) {
    state.ignored++;
    return { type: "ignored", reason: "too_soon" };
  }
  if (state.tapsCounted >= settings.maxTapsPerLevel) {
    state.ignored++;
    return { type: "ignored", reason: "over_limit" };
  }

  state.tapsCounted++;
  state.lastCountedTapAt = tap.t;

  const hit = hitTest(schedule, state, cfg, tap);
  if (!hit) return { type: "miss" };

  if (hit.kind === "cat") {
    if (tap.t - hit.appearAt < settings.minReactionMs) {
      state.tooFast++;
      return { type: "ignored", reason: "too_fast" };
    }
    state.resolved.add(hit.id);
    state.catches++;
    if (state.catches >= cfg.targetCatches) {
      state.ended = true;
      state.outcome = "passed";
      state.endedAt = tap.t;
    }
    return { type: "catch", spawnId: hit.id };
  }

  state.resolved.add(hit.id);
  state.decoyHits++;
  state.livesLeft--;
  if (state.livesLeft <= 0) {
    state.ended = true;
    state.outcome = "failed_lives";
    state.endedAt = tap.t;
  }
  return { type: "decoy", spawnId: hit.id };
}

/** Close the level when the clock runs out. */
export function finishLevel(state: LevelState, cfg: LevelConfig): LevelState {
  if (!state.ended) {
    state.ended = true;
    state.outcome = "failed_time";
    state.endedAt = cfg.durationMs;
  }
  return state;
}

export interface LevelResult {
  outcome: LevelOutcome;
  catches: number;
  decoyHits: number;
  endedAt: number;
  tapsCounted: number;
  ignored: number;
  tooFast: number;
  /** Time of the last tap the player sent, used for the server's clock check. */
  lastTapAt: number;
}

/** Replay a full tap log. This is what the server trusts. */
export function resolveLevel(
  seed: number,
  cfg: LevelConfig,
  settings: Pick<GameSettings, "minReactionMs" | "minTapGapMs" | "maxTapsPerLevel">,
  taps: Tap[],
): LevelResult {
  const schedule = generateSchedule(seed, cfg);
  const state = createLevelState(cfg);
  const ordered = [...taps].sort((a, b) => a.t - b.t);
  for (const tap of ordered) {
    if (state.ended) break;
    applyTap(schedule, state, cfg, settings, tap);
  }
  finishLevel(state, cfg);
  return {
    outcome: state.outcome as LevelOutcome,
    catches: state.catches,
    decoyHits: state.decoyHits,
    endedAt: state.endedAt as number,
    tapsCounted: state.tapsCounted,
    ignored: state.ignored,
    tooFast: state.tooFast,
    lastTapAt: ordered.length ? Math.max(0, ordered[ordered.length - 1].t) : 0,
  };
}
