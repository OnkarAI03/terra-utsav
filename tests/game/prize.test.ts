// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { localPrizeOpen, markLocalPrizeGiven, readLocalPrize, recordLocalWin, spendLocalAttempt, winnerCode } from "@/lib/game/prize";

describe("prize play without the database: the phone's own record", () => {
  beforeEach(() => localStorage.clear());

  it("starts fresh, and treats a damaged record as a fresh start", () => {
    expect(readLocalPrize()).toEqual({ attemptsUsed: 0, win: null });
    localStorage.setItem("tu-prize-v1", "{not json");
    expect(readLocalPrize()).toEqual({ attemptsUsed: 0, win: null });
    localStorage.setItem("tu-prize-v1", JSON.stringify({ attemptsUsed: -3, win: { code: 5 } }));
    expect(readLocalPrize()).toEqual({ attemptsUsed: 0, win: null });
  });

  it("counts attempts and keeps the first win", () => {
    spendLocalAttempt();
    expect(spendLocalAttempt().attemptsUsed).toBe(2);
    const first = recordLocalWin(new Date("2026-10-27T05:00:00Z"));
    expect(first.win?.code).toMatch(/^MINI-[2-9A-HJ-NP-Z]{4}$/);
    expect(first.win?.claimedAt).toBeNull();
    const again = recordLocalWin(new Date("2026-10-27T06:00:00Z"));
    expect(again.win).toEqual(first.win);
    expect(readLocalPrize().attemptsUsed).toBe(2);
  });

  it("marks the prize as given once, and only after a win", () => {
    expect(markLocalPrizeGiven().win).toBeNull();
    recordLocalWin();
    const given = markLocalPrizeGiven(new Date("2026-10-27T06:30:00Z"));
    expect(given.win?.claimedAt).toBe("2026-10-27T06:30:00.000Z");
    expect(markLocalPrizeGiven(new Date("2026-10-27T07:00:00Z")).win?.claimedAt).toBe("2026-10-27T06:30:00.000Z");
  });

  it("makes winner codes without look-alike characters", () => {
    expect(winnerCode([0, 1, 2, 3])).toBe("MINI-2345");
    expect(winnerCode([31, 30, 8, 9])).toBe("MINI-ZYAB");
    for (let i = 0; i < 50; i++) expect(winnerCode().slice(5)).not.toMatch(/[01OI]/);
  });

  it("stays open until the event ends", () => {
    const ends = "2026-10-27T15:00:00+05:30";
    expect(localPrizeOpen(ends, Date.parse("2026-10-25T12:00:00+05:30"))).toBe(true);
    expect(localPrizeOpen(ends, Date.parse("2026-10-27T14:59:00+05:30"))).toBe(true);
    expect(localPrizeOpen(ends, Date.parse("2026-10-27T15:01:00+05:30"))).toBe(false);
    expect(localPrizeOpen(null)).toBe(true);
  });
});
