// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  localPrizeOpen,
  markLocalPrizeGiven,
  nextPlayer,
  prizesGiven,
  readLocalPrize,
  readStallLog,
  readStallState,
  recordLocalWin,
  spendLocalAttempt,
  stallPinMatches,
  unlockStall,
  winnerCode,
} from "@/lib/game/prize";

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

describe("stall devices: the team's own laptops and phone", () => {
  const PIN = "468024";
  /** The server's answer to the team PIN: right only for PIN. */
  const server = vi.fn(async (_url: string, init?: RequestInit) => {
    const { pin } = JSON.parse(String(init?.body)) as { pin: string };
    return new Response(JSON.stringify(pin === PIN ? { ok: true } : { error: "wrong_pin" }), { status: pin === PIN ? 200 : 401 });
  });

  beforeEach(() => {
    localStorage.clear();
    server.mockClear();
    vi.stubGlobal("fetch", server);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("is off until the team asks for it, and asks for the PIN first", async () => {
    expect(readStallState("")).toBe("off");
    expect(readStallState("?stall=1")).toBe("ask");
    expect(await unlockStall("111111")).toBe("wrong");
    expect(readStallState("?stall=1")).toBe("ask");
    expect(await unlockStall(PIN)).toBe("ok");
    expect(server).toHaveBeenCalledWith("/api/stall", expect.objectContaining({ method: "POST" }));
    expect(readStallState("")).toBe("on");
  });

  it("keeps only a salted hash of the PIN, and checks it without the network", async () => {
    await unlockStall(PIN);
    const stored = Object.keys(localStorage).map((k) => localStorage.getItem(k) ?? "").join(" ");
    expect(stored).not.toContain(PIN);
    server.mockClear();
    expect(await stallPinMatches(PIN)).toBe(true);
    expect(await stallPinMatches(` ${PIN} `)).toBe(true);
    expect(await stallPinMatches("468025")).toBe(false);
    expect(await stallPinMatches("")).toBe(false);
    expect(server).not.toHaveBeenCalled();
  });

  it("says why the PIN didn't work", async () => {
    server.mockResolvedValueOnce(new Response("{}", { status: 503 }));
    expect(await unlockStall(PIN)).toBe("not-set");
    server.mockResolvedValueOnce(new Response("{}", { status: 429 }));
    expect(await unlockStall(PIN)).toBe("busy");
    server.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect(await unlockStall(PIN)).toBe("offline");
    expect(readStallState("")).toBe("off");
    expect(await stallPinMatches(PIN)).toBe(false);
  });

  it("turns off with ?stall=0", async () => {
    await unlockStall(PIN);
    expect(readStallState("?stall=0")).toBe("off");
    expect(readStallState("")).toBe("off");
    expect(await stallPinMatches(PIN)).toBe(false);
  });

  it("starts each next player afresh and keeps a tally of prizes given", () => {
    spendLocalAttempt();
    recordLocalWin(new Date("2026-10-27T05:00:00Z"));
    markLocalPrizeGiven(new Date("2026-10-27T05:02:00Z"));
    expect(prizesGiven(readStallLog(), readLocalPrize())).toBe(1);

    expect(nextPlayer()).toEqual({ attemptsUsed: 0, win: null });
    expect(readLocalPrize()).toEqual({ attemptsUsed: 0, win: null });
    expect(readStallLog()).toEqual([expect.objectContaining({ wonAt: "2026-10-27T05:00:00.000Z", givenAt: "2026-10-27T05:02:00.000Z" })]);

    // A win the team forgot to mark is kept in the tally but not counted as given.
    recordLocalWin(new Date("2026-10-27T06:00:00Z"));
    nextPlayer();
    spendLocalAttempt();
    nextPlayer();
    expect(readStallLog()).toHaveLength(2);
    expect(prizesGiven(readStallLog(), readLocalPrize())).toBe(1);
  });
});
