// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installDomMocks } from "../helpers/dom";

vi.mock("next/image", async () => (await import("../helpers/dom")).nextMocks.image());
vi.mock("next/link", async () => (await import("../helpers/dom")).nextMocks.link());
vi.mock("@/components/game/sprites", () => ({ loadSprites: () => Promise.resolve({}) }));

import { GameExperience } from "@/components/game/GameExperience";
import { DEFAULT_GAME_SETTINGS } from "@/lib/game/config";

const EVENT_DAY = "Tuesday, 27 October 2026, 9 am to 3 pm";

/** The game home as a visitor in a given state sees it (the status comes from /api/game/status). */
function renderWithStatus(status: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => status })),
  );
  render(<GameExperience settings={DEFAULT_GAME_SETTINGS} eventDay={EVENT_DAY} couponValueText="50% off a Chocolate Bomb" />);
}

describe("reward play: sign-ups open now, coupons on event day only", () => {
  beforeEach(() => installDomMocks());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("invites signed-out visitors to sign up before the event and says when coupons can be won", async () => {
    renderWithStatus({ configured: true, signedIn: false, rewardPhase: "before" });
    expect(await screen.findByRole("link", { name: "Sign up now" })).toHaveAttribute("href", "/login?next=/game");
    expect(screen.getByText(`Sign-ups are open now. Coupons can be won on event day only: ${EVENT_DAY}.`)).toBeInTheDocument();
  });

  it("tells signed-up players to come back on event day", async () => {
    renderWithStatus({ configured: true, signedIn: true, rewardPhase: "before", attemptsUsed: 0, attemptsAllowed: 2, activeAttempt: null, coupons: 0 });
    expect(await screen.findByRole("button", { name: "Reward play opens on event day" })).toBeDisabled();
    expect(screen.getByText(/You're signed up\. Coupons can be won on event day only/)).toBeInTheDocument();
  });

  it("opens reward play during the event", async () => {
    renderWithStatus({ configured: true, signedIn: true, rewardPhase: "open", attemptsUsed: 0, attemptsAllowed: 2, activeAttempt: null, coupons: 0 });
    expect(await screen.findByRole("button", { name: "Play for a reward" })).toBeEnabled();
    expect(screen.queryByText(/Coupons can be won on event day only/)).not.toBeInTheDocument();
  });

  it("asks signed-out visitors to sign in during the event", async () => {
    renderWithStatus({ configured: true, signedIn: false, rewardPhase: "open" });
    expect(await screen.findByRole("link", { name: "Sign in to play for a reward" })).toBeInTheDocument();
  });

  it("says when coupons are paused or reward play is over", async () => {
    renderWithStatus({ configured: true, signedIn: true, rewardPhase: "paused", attemptsUsed: 0, attemptsAllowed: 2, activeAttempt: null, coupons: 0 });
    expect(await screen.findByText("Coupons are paused right now. Practice is open.")).toBeInTheDocument();
    cleanup();
    renderWithStatus({ configured: true, signedIn: false, rewardPhase: "after" });
    expect(await screen.findByText("Reward play has ended. Thank you for playing!")).toBeInTheDocument();
  });

  it("lets a player finish an attempt they already started, whatever the time", async () => {
    renderWithStatus({ configured: true, signedIn: true, rewardPhase: "before", attemptsUsed: 1, attemptsAllowed: 2, activeAttempt: { id: "a1", currentLevel: 2 }, coupons: 0 });
    expect(await screen.findByRole("button", { name: "Continue reward attempt" })).toBeEnabled();
  });
});
