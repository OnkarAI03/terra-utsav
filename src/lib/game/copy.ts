import type { GameSettings } from "./config";

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** "three" for 3, so copy reads naturally and always matches the live settings. */
export function numberWord(n: number): string {
  return WORDS[n] ?? String(n);
}

export function gameFacts(settings: Pick<GameSettings, "levels" | "maxRewardAttempts">, prize?: string | null) {
  const levels = settings.levels.length;
  const attempts = settings.maxRewardAttempts;
  const levelsText = `${levels} level${levels === 1 ? "" : "s"}`;
  return {
    levels,
    attempts,
    lastLevel: levels,
    levelsWord: numberWord(levels),
    attemptsWord: numberWord(attempts),
    /** What winning gets you: "50% off a Chocolate Bomb", or "a coupon" until the value is set. */
    prize: prize || "a coupon",
    /** "3 levels · win 50% off a Chocolate Bomb", or "3 levels · 2 attempts · win a coupon" */
    subline: prize ? `${levelsText} · win ${prize}` : `${levelsText} · ${attempts} attempt${attempts === 1 ? "" : "s"} · win a coupon`,
  };
}
