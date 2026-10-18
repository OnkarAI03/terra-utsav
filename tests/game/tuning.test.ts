import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_SETTINGS } from "@/lib/game/config";
import { estimateWinRates } from "@/lib/game/simulate";

/**
 * Tuning objective from the brief: roughly 20-30% of players win across their two reward
 * attempts. This checks the default difficulty against the modelled "typical player" in
 * src/lib/game/simulate.ts. It is a model, not a guarantee: confirm with real playtests.
 */
describe("difficulty tuning (modelled)", () => {
  it("keeps the modelled two-attempt win rate inside the 20-30% target band", () => {
    const report = estimateWinRates(DEFAULT_GAME_SETTINGS, undefined, 2500);
    console.info(
      "[tuning] level pass rates:",
      report.levelPassRates.map((p) => `${Math.round(p * 1000) / 10}%`).join(" | "),
      "\n[tuning] cats per level:",
      report.catsPerLevel.map((c) => c.toFixed(1)).join(" | "),
      "\n[tuning] mean catches with no target:",
      report.meanCatchesIfUnlimited.map((c) => c.toFixed(1)).join(" | "),
      `\n[tuning] one attempt: ${(report.attemptWinRate * 100).toFixed(1)}%`,
      `| two attempts: ${(report.twoAttemptWinRate * 100).toFixed(1)}%`,
    );
    expect(report.twoAttemptWinRate).toBeGreaterThanOrEqual(0.2);
    expect(report.twoAttemptWinRate).toBeLessThanOrEqual(0.3);
  });

  it("makes every level harder than the one before it", () => {
    const report = estimateWinRates(DEFAULT_GAME_SETTINGS, undefined, 1500);
    for (let i = 1; i < report.levelPassRates.length; i++) {
      expect(report.levelPassRates[i]).toBeLessThan(report.levelPassRates[i - 1] + 0.02);
    }
  });
});
