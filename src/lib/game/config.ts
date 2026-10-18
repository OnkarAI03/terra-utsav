import { z } from "zod";

/**
 * Difficulty settings for Catch the Koochu Puchu.
 *
 * These defaults are a tuning starting point, not a promise. The modelled win rate across two
 * reward attempts is checked by tests/game/tuning.test.ts (target 20-30%) and must be confirmed
 * with real playtests before the event. Administrators can edit every value from /admin/game.
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
    levels: z.array(levelConfigSchema).length(5),
  })
  .refine((s) => s.levels.every((l, i) => l.level === i + 1), "Levels must be numbered 1 to 5 in order");

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
      blurb: "Koochu Puchu pops out of the Diwali gift boxes. Tap to catch.",
      durationMs: 30_000,
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
      name: "Decoy Drama",
      blurb: "Snacks pop up too. Tapping a snack costs a heart.",
      durationMs: 30_000,
      targetCatches: 12,
      lives: 3,
      spawnGapMs: [700, 1050],
      visibleMs: [940, 1240],
      dashMs: [1700, 2100],
      decoyChance: 0.3,
      dashChance: 0,
      maxActive: 3,
      catRadius: 0.1,
      decoyRadius: 0.09,
    },
    {
      level: 3,
      name: "Diya Dash",
      blurb: "Now the kitten sprints between the diyas. Catch it mid-run.",
      durationMs: 30_000,
      targetCatches: 15,
      lives: 3,
      spawnGapMs: [620, 950],
      visibleMs: [840, 1100],
      dashMs: [1450, 1800],
      decoyChance: 0.32,
      dashChance: 0.34,
      maxActive: 3,
      catRadius: 0.095,
      decoyRadius: 0.09,
    },
    {
      level: 4,
      name: "Chocolate Rush",
      blurb: "Faster, busier, sneakier. Two hearts only.",
      durationMs: 30_000,
      targetCatches: 16,
      lives: 2,
      spawnGapMs: [520, 820],
      visibleMs: [720, 940],
      dashMs: [1250, 1600],
      decoyChance: 0.4,
      dashChance: 0.36,
      maxActive: 4,
      catRadius: 0.09,
      decoyRadius: 0.09,
    },
    {
      level: 5,
      name: "Diwali Finale",
      blurb: "Koochu Puchu at full Diwali speed. Catch 18 to win.",
      durationMs: 30_000,
      targetCatches: 18,
      lives: 2,
      spawnGapMs: [440, 720],
      visibleMs: [620, 830],
      dashMs: [1050, 1350],
      decoyChance: 0.4,
      dashChance: 0.4,
      maxActive: 4,
      catRadius: 0.085,
      decoyRadius: 0.09,
    },
  ],
};

/** Parse settings from the database, falling back to the defaults if they are missing or invalid. */
export function parseGameSettings(input: unknown): GameSettings {
  const parsed = gameSettingsSchema.safeParse(input);
  return parsed.success ? parsed.data : DEFAULT_GAME_SETTINGS;
}
