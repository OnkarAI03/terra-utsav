import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_SETTINGS, gameSettingsSchema, parseGameSettings } from "@/lib/game/config";
import {
  applyTap,
  createLevelState,
  generateSchedule,
  positionAt,
  resolveLevel,
  SPOTS,
  type Tap,
} from "@/lib/game/engine";

const settings = DEFAULT_GAME_SETTINGS;
const level = (n: number) => settings.levels[n - 1];

/** A perfect but human-paced player: taps every cat 300 ms after it appears. */
function perfectTaps(seed: number, n: number, delay = 300): Tap[] {
  const cfg = level(n);
  return generateSchedule(seed, cfg)
    .filter((s) => s.kind === "cat" && delay < s.visibleMs)
    .map((s) => {
      const t = s.appearAt + delay;
      const p = positionAt(s, t);
      return { t, x: p.x, y: p.y };
    });
}

describe("level schedule", () => {
  it("is identical for the same seed (browser and server agree)", () => {
    for (let n = 1; n <= settings.levels.length; n++) {
      expect(generateSchedule(12345, level(n))).toEqual(generateSchedule(12345, level(n)));
    }
  });

  it("differs between seeds and between levels", () => {
    expect(generateSchedule(1, level(3))).not.toEqual(generateSchedule(2, level(3)));
    expect(generateSchedule(7, level(2))).not.toEqual(generateSchedule(7, level(3)));
  });

  it("offers more cats than the level asks for", () => {
    for (let n = 1; n <= settings.levels.length; n++) {
      for (let seed = 1; seed <= 40; seed++) {
        const cats = generateSchedule(seed, level(n)).filter((s) => s.kind === "cat").length;
        expect(cats).toBeGreaterThan(level(n).targetCatches);
      }
    }
  });

  it("introduces new mechanics progressively", () => {
    const decoys = (n: number) => generateSchedule(99, level(n)).filter((s) => s.kind === "decoy").length;
    const dashes = (n: number) => generateSchedule(99, level(n)).filter((s) => s.motion === "dash").length;
    expect(decoys(1)).toBe(0);
    expect(dashes(1)).toBe(0);
    expect(decoys(2)).toBeGreaterThan(0);
    expect(dashes(2)).toBeGreaterThan(0);
    expect(decoys(3)).toBeGreaterThan(decoys(2) * 0.8);
  });

  it("never exceeds the number of things on screen at once", () => {
    for (let n = 1; n <= settings.levels.length; n++) {
      const cfg = level(n);
      const sched = generateSchedule(4242, cfg);
      for (const s of sched) {
        const overlapping = sched.filter((o) => o.appearAt <= s.appearAt && s.appearAt < o.appearAt + o.visibleMs);
        expect(overlapping.length).toBeLessThanOrEqual(cfg.maxActive);
      }
    }
  });
});

describe("tap resolution", () => {
  it("passes a level when a human-paced player catches enough cats", () => {
    for (let n = 1; n <= settings.levels.length; n++) {
      const result = resolveLevel(777, level(n), settings, perfectTaps(777, n));
      expect(result.outcome).toBe("passed");
      expect(result.catches).toBe(level(n).targetCatches);
    }
  });

  it("ignores taps that land on nothing", () => {
    const result = resolveLevel(5, level(1), settings, [
      { t: 2000, x: 0.02, y: 0.02 },
      { t: 4000, x: 0.98, y: 0.02 },
    ]);
    expect(result.catches).toBe(0);
    expect(result.outcome).toBe("failed_time");
  });

  it("does not count bot-fast reactions", () => {
    const taps = perfectTaps(31, 1, 20);
    const result = resolveLevel(31, level(1), settings, taps);
    expect(result.catches).toBe(0);
    expect(result.tooFast).toBeGreaterThan(0);
    expect(result.outcome).not.toBe("passed");
  });

  it("does not count rapid-fire spam taps", () => {
    const spam: Tap[] = [];
    for (let t = 0; t < level(1).durationMs; t += 10) {
      const spot = SPOTS[(t / 10) % SPOTS.length];
      spam.push({ t, x: spot.x, y: spot.y });
    }
    const result = resolveLevel(8, level(1), settings, spam);
    expect(result.tapsCounted).toBeLessThanOrEqual(settings.maxTapsPerLevel);
    expect(result.ignored).toBeGreaterThan(spam.length / 2);
  });

  it("caps the number of counted taps per level", () => {
    const taps: Tap[] = Array.from({ length: 1000 }, (_, i) => ({ t: i * 100, x: 0.5, y: 0.5 }));
    const result = resolveLevel(3, { ...level(1), durationMs: 90_000 }, settings, taps);
    expect(result.tapsCounted).toBeLessThanOrEqual(settings.maxTapsPerLevel);
  });

  it("loses a heart for each decoy and fails when hearts run out", () => {
    const cfg = level(2);
    const decoys = generateSchedule(2024, cfg).filter((s) => s.kind === "decoy");
    expect(decoys.length).toBeGreaterThanOrEqual(cfg.lives);
    const taps = decoys.slice(0, cfg.lives).map((s) => ({ t: s.appearAt + 300, x: s.from.x, y: s.from.y }));
    const result = resolveLevel(2024, cfg, settings, taps);
    expect(result.decoyHits).toBe(cfg.lives);
    expect(result.outcome).toBe("failed_lives");
  });

  it("ignores taps after the clock runs out", () => {
    const cfg = level(1);
    const late = perfectTaps(10, 1).map((t) => ({ ...t, t: t.t + cfg.durationMs }));
    const result = resolveLevel(10, cfg, settings, late);
    expect(result.catches).toBe(0);
  });

  it("cannot catch the same kitten twice", () => {
    const cfg = level(1);
    const first = generateSchedule(55, cfg).find((s) => s.kind === "cat")!;
    const state = createLevelState(cfg);
    const sched = generateSchedule(55, cfg);
    const a = applyTap(sched, state, cfg, settings, { t: first.appearAt + 300, x: first.from.x, y: first.from.y });
    const b = applyTap(sched, state, cfg, settings, { t: first.appearAt + 600, x: first.from.x, y: first.from.y });
    expect(a.type).toBe("catch");
    expect(b.type).not.toBe("catch");
    expect(state.catches).toBe(1);
  });

  it("ends the level the moment the target is reached", () => {
    const taps = perfectTaps(321, 1);
    const result = resolveLevel(321, level(1), settings, taps);
    const needed = taps[level(1).targetCatches - 1];
    expect(result.endedAt).toBe(needed.t);
  });
});

describe("settings validation", () => {
  it("accepts the defaults: three levels", () => {
    expect(gameSettingsSchema.safeParse(DEFAULT_GAME_SETTINGS).success).toBe(true);
    expect(DEFAULT_GAME_SETTINGS.levels).toHaveLength(3);
  });

  it("rejects levels that are out of order", () => {
    const shuffled = { ...DEFAULT_GAME_SETTINGS, levels: [DEFAULT_GAME_SETTINGS.levels[1], DEFAULT_GAME_SETTINGS.levels[0]] };
    expect(gameSettingsSchema.safeParse(shuffled).success).toBe(false);
  });

  it("rejects broken settings and falls back to defaults", () => {
    const broken = { ...DEFAULT_GAME_SETTINGS, levels: [] };
    expect(gameSettingsSchema.safeParse(broken).success).toBe(false);
    expect(parseGameSettings(broken)).toEqual(DEFAULT_GAME_SETTINGS);
    expect(parseGameSettings(null)).toEqual(DEFAULT_GAME_SETTINGS);
  });

  it("rejects inverted ranges", () => {
    const bad = structuredClone(DEFAULT_GAME_SETTINGS);
    bad.levels[0].visibleMs = [2000, 1000];
    expect(gameSettingsSchema.safeParse(bad).success).toBe(false);
  });
});
