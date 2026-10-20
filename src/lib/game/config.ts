import { z } from "zod";

/**
 * Difficulty settings for Catch Mini.
 *
 * Three levels (about a minute and a half of play). These defaults are a tuning starting point, not
 * a promise: the modelled win rate across two reward attempts (target 20-30%, roughly 2 or 3 players
 * in 10) is checked by tests/game/tuning.test.ts and must be confirmed with real playtests before
 * the event. Administrators can edit every value from /admin/game.
 */

const range = z
  .tuple([z.number().int().min(50).max(10_000), z.number().int().min(50).max(10_000)])
  .refine(([a, b]) => a <= b, "The first number must not be larger than the second");

export const levelConfigSchema = z.object({
  level: z.number().int().min(1).max(5),
  name: z.string().min(1).max(40),
  blurb: z.string().min(1).max(140),
  durationMs: z.number().int().min(10_000).max(90_000),
  targetCatches: z.number().int().min(1).max(40),
  lives: z.number().int().min(1).max(5),
  spawnGapMs: range,
  visibleMs: range,
  dashMs: range,
  decoyChance: z.number().min(0).max(0.8),
  dashChance: z.number().min(0).max(0.9),
  maxActive: z.number().int().min(1).max(6),
  catRadius: z.number().min(0.04).max(0.2),
  decoyRadius: z.number().min(0.04).max(0.2),
});

export const gameSettingsSchema = z
  .object({
    version: z.number().int().min(1),
    maxRewardAttempts: z.number().int().min(0).max(10),
    practiceEnabled: z.boolean(),
    minReactionMs: z.number().int().min(0).max(600),
    minTapGapMs: z.number().int().min(0).max(500),
    maxTapsPerLevel: z.number().int().min(20).max(600),
    countdownMs: z.number().int().min(0).max(10_000),
    levels: z.array(levelConfigSchema).min(1).max(5),
  })
  .refine((s) => s.levels.every((l, i) => l.level === i + 1), "Levels must be numbered from 1 in order");

export type LevelConfig = z.infer<typeof levelConfigSchema>;
export type GameSettings = z.infer<typeof gameSettingsSchema>;

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  version: 1,
  maxRewardAttempts: 2,
  practiceEnabled: true,
  minReactionMs: 140,
  minTapGapMs: 90,
  maxTapsPerLevel: 160,
  countdownMs: 3000,
  levels: [
    {
      level: 1,
      name: "Warm-up Whiskers",
      blurb: "Mini pops out of the Diwali gift boxes. Tap to catch.",
      durationMs: 25_000,
      targetCatches: 8,
      lives: 3,
      spawnGapMs: [850, 1250],
      visibleMs: [1300, 1700],
      dashMs: [1800, 2200],
      decoyChance: 0,
      dashChance: 0,
      maxActive: 2,
      catRadius: 0.11,
      decoyRadius: 0.09,
    },
    {
      level: 2,
      name: "Diya Dash",
      blurb: "Snacks pop up too, and the kitten starts to sprint. Two hearts: tapping a snack costs one.",
      durationMs: 30_000,
      targetCatches: 15,
      lives: 2,
      spawnGapMs: [600, 900],
      visibleMs: [800, 1050],
      dashMs: [1300, 1650],
      decoyChance: 0.35,
      dashChance: 0.3,
      maxActive: 3,
      catRadius: 0.095,
      decoyRadius: 0.09,
    },
    {
      level: 3,
      name: "Diwali Finale",
      blurb: "Mini at full Diwali speed. Catch 21 to win.",
      durationMs: 30_000,
      targetCatches: 21,
      lives: 2,
      spawnGapMs: [460, 740],
      visibleMs: [640, 860],
      dashMs: [1100, 1400],
      decoyChance: 0.4,
      dashChance: 0.38,
      maxActive: 4,
      catRadius: 0.088,
      decoyRadius: 0.09,
    },
  ],
};

/** Parse settings from the database, falling back to the defaults if they are missing or invalid. */
export function parseGameSettings(input: unknown): GameSettings {
  const parsed = gameSettingsSchema.safeParse(input);
  return parsed.success ? parsed.data : DEFAULT_GAME_SETTINGS;
}
