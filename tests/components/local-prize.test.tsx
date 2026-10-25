// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installDomMocks } from "../helpers/dom";

vi.mock("next/image", async () => (await import("../helpers/dom")).nextMocks.image());
vi.mock("next/link", async () => (await import("../helpers/dom")).nextMocks.link());
vi.mock("@/components/game/sprites", () => ({ loadSprites: () => Promise.resolve({}) }));
vi.mock("@/lib/supabase/browser", () => ({ getSupabaseBrowserClient: () => null }));

import { GameExperience } from "@/components/game/GameExperience";
import { DEFAULT_GAME_SETTINGS } from "@/lib/game/config";
import { readLocalPrize, unlockStall } from "@/lib/game/prize";

const EVENT_DAY = "Tuesday, 27 October 2026, 9 am to 3 pm";
const ENDS = "2026-10-27T15:00:00+05:30";

const PIN = "468024";

/** The live site today: no database, so the game plays for prizes on the device's own record. The stall PIN is PIN. */
function stubServer() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/stall") {
        const right = (JSON.parse(String(init?.body)) as { pin: string }).pin === PIN;
        return new Response(JSON.stringify(right ? { ok: true } : { error: "wrong_pin" }), { status: right ? 200 : 401 });
      }
      return new Response(JSON.stringify({ configured: false, signedIn: false }));
    }),
  );
}

function renderOffline(endsAt = ENDS) {
  stubServer();
  render(<GameExperience settings={DEFAULT_GAME_SETTINGS} eventDay={EVENT_DAY} couponValueText={null} eventEndsAt={endsAt} />);
}

/** Types a PIN into the open "Team only" dialog and submits it. */
function enterPin(dialog: HTMLElement, pin: string, submit: string) {
  fireEvent.change(within(dialog).getByLabelText("Team PIN"), { target: { value: pin } });
  fireEvent.click(within(dialog).getByRole("button", { name: submit }));
}

describe("prize play without the database", () => {
  beforeEach(() => {
    installDomMocks({ reducedMotion: true });
    localStorage.clear();
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-25T12:00:00+05:30") });
  });
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, "", "/");
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
    expect(screen.getByText("This will be attempt 1 of 2 on this device.")).toBeInTheDocument();
    expect(screen.queryByText(/Prizes given on this device/)).not.toBeInTheDocument();
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
    expect(screen.getByText(`Please collect your prize from the TERRA UTSAV team at the stall (${EVENT_DAY}). Show them this card, live on this device.`)).toBeInTheDocument();
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

  it("turns stall mode on only with the team PIN", async () => {
    window.history.replaceState(null, "", "/game?stall=1");
    renderOffline();
    const dialog = await screen.findByRole("dialog", { name: "Turn on stall mode" });
    enterPin(dialog, "111111", "Turn on");
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("That PIN didn't work. Try again.");
    expect(screen.queryByText(/Prizes given on this device/)).not.toBeInTheDocument();

    enterPin(dialog, PIN, "Turn on");
    expect(await screen.findByText(/Prizes given on this device: \d/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
    expect(screen.getByText("Win all three levels and collect your prize from our team, right here.")).toBeInTheDocument();
  });

  it("has a Stall mode button on the game screen, so the team needs no special link", async () => {
    renderOffline();
    fireEvent.click(await screen.findByRole("button", { name: "Stall mode" }));
    enterPin(await screen.findByRole("dialog", { name: "Turn on stall mode" }), PIN, "Turn on");
    expect(await screen.findByText(/Prizes given on this device: 0/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stall mode" })).not.toBeInTheDocument();
  });

  it("leaves stall mode off when the PIN dialog is cancelled", async () => {
    window.history.replaceState(null, "", "/game?stall=1");
    renderOffline();
    fireEvent.click(within(await screen.findByRole("dialog", { name: "Turn on stall mode" })).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(/Prizes given on this device/)).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
    expect(await screen.findByRole("button", { name: "Play for a prize" })).toBeEnabled();
  });

  it("on a stall device, asks for the PIN before the next player, then starts afresh", async () => {
    stubServer();
    expect(await unlockStall(PIN)).toBe("ok");
    localStorage.setItem("tu-prize-v1", JSON.stringify({ attemptsUsed: 1, win: { code: "MINI-7K4Q", wonAt: "2026-10-25T06:00:00.000Z", claimedAt: null } }));
    vi.stubGlobal("confirm", vi.fn(() => true));
    renderOffline();
    expect(await screen.findByText(/Prizes given on this device: \d/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Show my winner card" }));
    expect(await screen.findByText("Please collect your prize from the TERRA UTSAV team, right here at the stall.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next player" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Prize given" }));

    fireEvent.click(screen.getByRole("button", { name: "Next player" }));
    const dialog = await screen.findByRole("dialog", { name: "Next player" });
    enterPin(dialog, "000000", "Start next player");
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("That PIN didn't work. Try again.");
    expect(readLocalPrize().win?.code).toBe("MINI-7K4Q");

    enterPin(dialog, PIN, "Start next player");
    expect(await screen.findByRole("button", { name: "Play for a prize" })).toBeEnabled();
    expect(screen.getByText(/Prizes given on this device: 1/)).toBeInTheDocument();
    expect(readLocalPrize()).toEqual({ attemptsUsed: 0, win: null });
  });

  it("gives a player who is out of attempts no way round the PIN", async () => {
    stubServer();
    await unlockStall(PIN);
    localStorage.setItem("tu-prize-v1", JSON.stringify({ attemptsUsed: 2, win: null }));
    renderOffline();
    expect(await screen.findByRole("button", { name: "No prize attempts left" })).toBeDisabled();
    expect(screen.getByText("Prize attempts used by this player: 2 of 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next player" }));
    const dialog = await screen.findByRole("dialog", { name: "Next player" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No prize attempts left" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next player" }));
    enterPin(await screen.findByRole("dialog", { name: "Next player" }), PIN, "Start next player");
    expect(await screen.findByRole("button", { name: "Play for a prize" })).toBeEnabled();
  });
});
