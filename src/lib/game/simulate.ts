import type { GameSettings, LevelConfig } from "./config";
import { generateSchedule, isActive, positionAt, resolveLevel, type Tap } from "./engine";
import { mulberry32 } from "./rng";

/**
 * A simple model of a player, used only to tune difficulty. It is not used during real play and
 * never influences any individual player's result.
 *
 * The model reacts to each target after a log-normally distributed delay, can only tap so fast,
 * sometimes misses a target when the stall gets busy, aims with some error (more on moving
 * targets) and occasionally taps a decoy by reflex.
 */
export interface PlayerModel {
  reactionMedianMs: number;
  reactionSpread: number;
  motorMs: number;
  aimErrorPop: number;
  aimErrorDash: number;
  noticeChance: number;
  overloadPenalty: number;
  decoyMistakeChance: number;
}

export const TYPICAL_PLAYER: PlayerModel = {
  reactionMedianMs: 470,
  reactionSpread: 0.3,
  motorMs: 230,
  aimErrorPop: 0.035,
  aimErrorDash: 0.06,
  noticeChance: 0.95,
  overloadPenalty: 0.07,
  decoyMistakeChance: 0.12,
};

function gaussian(rnd: () => number): number {
  let u = 0;
  while (u === 0) u = rnd();
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function simulatePlayerTaps(seed: number, cfg: LevelConfig, player: PlayerModel, rnd: () => number): Tap[] {
  const schedule = generateSchedule(seed, cfg).sort((a, b) => a.appearAt - b.appearAt);
  const taps: Tap[] = [];
  let busyUntil = 0;

  for (const s of schedule) {
    const load = schedule.filter((o) => isActive(o, s.appearAt)).length;
    const reaction = player.reactionMedianMs * Math.exp(player.reactionSpread * gaussian(rnd));

    if (s.kind === "decoy") {
      if (rnd() >= player.decoyMistakeChance) continue;
      const t = Math.max(s.appearAt + reaction * 0.75, busyUntil);
      if (t >= s.appearAt + s.visibleMs) continue;
      const p = positionAt(s, t);
      taps.push({ t, x: p.x + gaussian(rnd) * player.aimErrorPop, y: p.y + gaussian(rnd) * player.aimErrorPop });
      busyUntil = t + player.motorMs;
      continue;
    }

    const notice = player.noticeChance - player.overloadPenalty * Math.max(0, load - 1);
    if (rnd() >= notice) continue;
    const t = Math.max(s.appearAt + reaction, busyUntil);
    if (t >= s.appearAt + s.visibleMs - 20) continue;
    const p = positionAt(s, t);
    const err = s.motion === "dash" ? player.aimErrorDash : player.aimErrorPop;
    taps.push({ t, x: p.x + gaussian(rnd) * err, y: p.y + gaussian(rnd) * err });
    busyUntil = t + player.motorMs;
  }
  return taps;
}

export interface TuningReport {
  levelPassRates: number[];
  attemptWinRate: number;
  twoAttemptWinRate: number;
  catsPerLevel: number[];
  meanCatchesIfUnlimited: number[];
}

export function estimateWinRates(
  settings: GameSettings,
  player: PlayerModel = TYPICAL_PLAYER,
  runsPerLevel = 3000,
  seed = 20261018,
): TuningReport {
  const rnd = mulberry32(seed);
  const levelPassRates: number[] = [];
  const catsPerLevel: number[] = [];
  const meanCatchesIfUnlimited: number[] = [];

  for (const cfg of settings.levels) {
    let passed = 0;
    let cats = 0;
    let unlimited = 0;
    const open = { ...cfg, targetCatches: 999, lives: 99 };
    for (let i = 0; i < runsPerLevel; i++) {
      const levelSeed = Math.floor(rnd() * 0x7fffffff);
      const taps = simulatePlayerTaps(levelSeed, cfg, player, rnd);
      const result = resolveLevel(levelSeed, cfg, settings, taps);
      if (result.outcome === "passed") passed++;
      unlimited += resolveLevel(levelSeed, open, settings, taps).catches;
      cats += generateSchedule(levelSeed, cfg).filter((s) => s.kind === "cat").length;
    }
    levelPassRates.push(passed / runsPerLevel);
    catsPerLevel.push(cats / runsPerLevel);
    meanCatchesIfUnlimited.push(unlimited / runsPerLevel);
  }

  const attemptWinRate = levelPassRates.reduce((a, b) => a * b, 1);
  const attempts = Math.max(1, settings.maxRewardAttempts);
  return {
    levelPassRates,
    attemptWinRate,
    twoAttemptWinRate: 1 - Math.pow(1 - attemptWinRate, attempts),
    catsPerLevel,
    meanCatchesIfUnlimited,
  };
}
