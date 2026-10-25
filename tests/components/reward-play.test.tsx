// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installDomMocks } from "../helpers/dom";

vi.mock("next/image", async () => (await import("../helpers/dom")).nextMocks.image());
vi.mock("next/link", async () => (await import("../helpers/dom")).nextMocks.link());
vi.mock("@/components/game/sprites", () => ({ loadSprites: () => Promise.resolve({}) }));

const signInAnonymously = vi.fn(async () => ({ data: {}, error: null as Error | null }));
vi.mock("@/lib/supabase/browser", () => ({ getSupabaseBrowserClient: () => ({ auth: { signInAnonymously } }) }));

import { GameExperience } from "@/components/game/GameExperience";
import { DEFAULT_GAME_SETTINGS } from "@/lib/game/config";

const EVENT_DAY = "Tuesday, 27 October 2026, 9 am to 3 pm";
const GUEST = { configured: true, signedIn: true, rewardPhase: "open", attemptsUsed: 0, attemptsAllowed: 2, activeAttempt: null, coupons: 0 };

/** The game home as a visitor sees it; each /api/game/status call answers with the next status. */
function renderWithStatuses(...statuses: Record<string, unknown>[]) {
  let i = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const status = statuses[Math.min(i, statuses.length - 1)];
      i += 1;
      return { ok: true, json: async () => status };
    }),
  );
  render(<GameExperience settings={DEFAULT_GAME_SETTINGS} eventDay={EVENT_DAY} couponValueText="50% off a Chocolate Bomb" />);
}

describe("reward play: no sign-up, coupons on event day only, one per person", () => {
  beforeEach(() => {
    installDomMocks();
    signInAnonymously.mockClear();
    signInAnonymously.mockImplementation(async () => ({ data: {}, error: null }));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("says when coupons can be won before the event, with no sign-up anywhere", async () => {
    renderWithStatuses({ configured: true, signedIn: false, rewardPhase: "before" });
    expect(await screen.findByRole("button", { name: "Reward play opens on event day" })).toBeDisabled();
    expect(screen.getByText(`No sign-up needed. Coupons can be won on event day only: ${EVENT_DAY}.`)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign (in|up)/i })).not.toBeInTheDocument();
  });

  it("makes a guest player when a visitor plays for a reward during the event", async () => {
    renderWithStatuses({ configured: true, signedIn: false, rewardPhase: "open" }, GUEST);
    const play = await screen.findByRole("button", { name: "Play for a reward" });
    await act(async () => {
      fireEvent.click(play);
    });
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("heading", { name: "Use a reward attempt?" })).toBeInTheDocument();
    expect(screen.getByText("This uses attempt 1 of 2.")).toBeInTheDocument();
    expect(screen.getByText(/One coupon per person\./)).toBeInTheDocument();
  });

  it("lets a returning guest play straight on", async () => {
    renderWithStatuses(GUEST);
    const play = await screen.findByRole("button", { name: "Play for a reward" });
    await act(async () => {
      fireEvent.click(play);
    });
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(await screen.findByRole("heading", { name: "Use a reward attempt?" })).toBeInTheDocument();
  });

  it("says so when a guest player can't be made", async () => {
    signInAnonymously.mockImplementation(async () => ({ data: {}, error: new Error("rate limited") }));
    renderWithStatuses({ configured: true, signedIn: false, rewardPhase: "open" });
    const play = await screen.findByRole("button", { name: "Play for a reward" });
    await act(async () => {
      fireEvent.click(play);
    });
    expect(await screen.findByText(/Couldn't start reward play just now/)).toBeInTheDocument();
  });

  it("says when coupons are paused, when reward play is over, and when it isn't switched on", async () => {
    renderWithStatuses({ configured: true, signedIn: false, rewardPhase: "paused" });
    expect(await screen.findByText("Coupons are paused right now. Practice is open.")).toBeInTheDocument();
    cleanup();
    renderWithStatuses({ configured: true, signedIn: false, rewardPhase: "after" });
    expect(await screen.findByText("Reward play has ended. Thank you for playing!")).toBeInTheDocument();
    cleanup();
    // Without the database the game offers prize play instead (see local-prize.test.tsx).
    renderWithStatuses({ configured: false, signedIn: false });
    expect(await screen.findByRole("button", { name: "Play for a prize" })).toBeEnabled();
  });

  it("lets a player finish an attempt they already started, whatever the time", async () => {
    renderWithStatuses({ ...GUEST, rewardPhase: "after", attemptsUsed: 1, activeAttempt: { id: "a1", currentLevel: 2 } });
    expect(await screen.findByRole("button", { name: "Continue reward attempt" })).toBeEnabled();
  });
});
