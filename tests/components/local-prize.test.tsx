// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installDomMocks } from "../helpers/dom";

vi.mock("next/image", async () => (await import("../helpers/dom")).nextMocks.image());
vi.mock("next/link", async () => (await import("../helpers/dom")).nextMocks.link());
vi.mock("@/components/game/sprites", () => ({ loadSprites: () => Promise.resolve({}) }));
vi.mock("@/lib/supabase/browser", () => ({ getSupabaseBrowserClient: () => null }));

import { GameExperience } from "@/components/game/GameExperience";
import { DEFAULT_GAME_SETTINGS } from "@/lib/game/config";

const EVENT_DAY = "Tuesday, 27 October 2026, 9 am to 3 pm";
const ENDS = "2026-10-27T15:00:00+05:30";

/** The live site today: no database, so the game plays for prizes on the phone's own record. */
function renderOffline(endsAt = ENDS) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ configured: false, signedIn: false }) })));
  render(<GameExperience settings={DEFAULT_GAME_SETTINGS} eventDay={EVENT_DAY} couponValueText={null} eventEndsAt={endsAt} />);
}

describe("prize play without the database", () => {
  beforeEach(() => {
    installDomMocks({ reducedMotion: true });
    localStorage.clear();
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-25T12:00:00+05:30") });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("offers a prize attempt and says where the prize is collected", async () => {
    renderOffline();
    const play = await screen.findByRole("button", { name: "Play for a prize" });
    expect(screen.getByText(`No sign-up needed. Win all three levels, then collect your prize from our team at the stall: ${EVENT_DAY}.`)).toBeInTheDocument();
    fireEvent.click(play);
    expect(await screen.findByRole("heading", { name: "Use a prize attempt?" })).toBeInTheDocument();
    expect(screen.getByText("This will be attempt 1 of 2 on this phone.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Let's go" }));
    expect(await screen.findByText("Prize attempt 1 · Level 1")).toBeInTheDocument();
    // Backing out before the level starts costs nothing.
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(localStorage.getItem("tu-prize-v1")).toBeNull();
  });

  it("shows the winner card with the congratulations, and the team marks the prize as given", async () => {
    localStorage.setItem("tu-prize-v1", JSON.stringify({ attemptsUsed: 1, win: { code: "MINI-7K4Q", wonAt: "2026-10-25T06:00:00.000Z", claimedAt: null } }));
    vi.stubGlobal("confirm", vi.fn(() => true));
    renderOffline();
    fireEvent.click(await screen.findByRole("button", { name: "Show my winner card" }));
    expect(await screen.findByRole("heading", { name: "Congratulations! You won!" })).toBeInTheDocument();
    expect(screen.getByText(`Please collect your prize from the TERRA UTSAV team at the stall (${EVENT_DAY}). Show them this card, live on this phone.`)).toBeInTheDocument();
    expect(screen.getByText("MINI-7K4Q")).toBeInTheDocument();
    expect(screen.queryByText(/% off/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Prize given" }));
    expect(screen.getByText("Prize collected. Enjoy, and happy Diwali!")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("tu-prize-v1") ?? "{}").win.claimedAt).toEqual(expect.any(String));
  });

  it("stops at two attempts per phone, and closes when the event is over", async () => {
    localStorage.setItem("tu-prize-v1", JSON.stringify({ attemptsUsed: 2, win: null }));
    renderOffline();
    expect(await screen.findByRole("button", { name: "No prize attempts left" })).toBeDisabled();
    cleanup();
    localStorage.clear();
    renderOffline("2026-10-24T15:00:00+05:30");
    expect(await screen.findByText("Prize play has ended. Thank you for playing!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Practise level 1" })).toBeEnabled();
  });
});
