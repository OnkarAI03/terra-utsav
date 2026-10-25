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
    /** What winning gets you: "a prize", unless an admin names a specific one. */
    prize: prize || "a prize",
    /** "3 levels · 2 attempts · win a prize", or "3 levels · win <the named prize>" */
    subline: prize ? `${levelsText} · win ${prize}` : `${levelsText} · ${attempts} attempt${attempts === 1 ? "" : "s"} · win a prize`,
  };
}
