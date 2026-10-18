// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installDomMocks } from "../helpers/dom";

vi.mock("next/image", async () => (await import("../helpers/dom")).nextMocks.image());
vi.mock("next/link", async () => (await import("../helpers/dom")).nextMocks.link());
// No pictures in jsdom: the board draws its fallback shapes.
vi.mock("@/components/game/sprites", () => ({ loadSprites: () => Promise.resolve({}) }));

import { GameBoard, type BoardResult } from "@/components/game/GameBoard";
import { GameExperience } from "@/components/game/GameExperience";
import { DEFAULT_GAME_SETTINGS } from "@/lib/game/config";
import { SPOTS } from "@/lib/game/engine";

const settings = DEFAULT_GAME_SETTINGS;
const level1 = settings.levels[0];
/** The number keys in the order the boxes are drawn (SPOTS order): a number pad, 7 8 9 on top. */
const PAD = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/** matchMedia for a phone: the main pointer is a finger. */
function touchScreen() {
  const mm = vi.fn((query: string) => ({
    matches: query.includes("pointer: coarse"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  vi.stubGlobal("matchMedia", mm);
  Object.defineProperty(window, "matchMedia", { value: mm, configurable: true, writable: true });
}

/** A 2D context that draws nothing and keeps the text of every fillText. */
function fakeContext(texts: string[]) {
  const props: Record<string | symbol, unknown> = {};
  return new Proxy(props, {
    get: (_, key) => (key === "fillText" ? (text: string) => texts.push(text) : key in props ? props[key] : () => undefined),
    set: (_, key, value) => {
      props[key] = value;
      return true;
    },
  });
}

describe("GameBoard: keyboard and screen-reader play", () => {
  const START = 1000;
  let now = START;
  let frames: FrameRequestCallback[] = [];
  let texts: string[] = [];

  beforeEach(() => {
    installDomMocks();
    now = START;
    frames = [];
    texts = [];
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    vi.stubGlobal("ResizeObserver", NoopResizeObserver);
    Object.defineProperty(Element.prototype, "scrollIntoView", { value: vi.fn(), configurable: true, writable: true });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fakeContext(texts) as never);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** Set the level clock to `ms` after the start and run the next frame. Returns the text it drew. */
  const frameAt = (ms: number) => {
    now = START + ms;
    texts.length = 0;
    const queued = frames;
    frames = [];
    act(() => queued.forEach((cb) => cb(now)));
    return [...texts];
  };

  const renderBoard = (props: Partial<ComponentProps<typeof GameBoard>> = {}) => {
    const onFinish = vi.fn<(result: BoardResult) => void>();
    const view = render(
      <GameBoard seed={7} config={level1} settings={settings} sound={false} reduceMotion={false} rewardMode={false} onFinish={onFinish} {...props} />,
    );
    return { ...view, onFinish, board: screen.getByRole("application") };
  };

  /** Play a level without tapping and list what the live region says, in order. */
  const listen = (container: HTMLElement, durationMs: number) => {
    const live = container.querySelector("p[aria-live]")!;
    const heard: string[] = [];
    for (let ms = 0; ms < durationMs; ms += 250) {
      frameAt(ms);
      const text = live.textContent ?? "";
      if (text && text !== heard.at(-1)) heard.push(text);
    }
    return heard;
  };

  it("takes focus when the level starts, so the number keys work without a click, and the focus never scrolls", () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    const { board } = renderBoard();
    expect(board).toHaveFocus();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("asks for no focus ring when it takes focus on a touch screen", () => {
    touchScreen();
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    const { board } = renderBoard();
    expect(board).toHaveFocus();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true, focusVisible: false });
  });

  it("taps the centre of each box from its number key, recorded as (time, x, y)", () => {
    const { board, onFinish } = renderBoard();
    PAD.forEach((key, i) => {
      now = START + 100 + i * 50; // before the first kitten, so every press is a plain miss
      fireEvent.keyDown(board, { key });
    });
    fireEvent.click(screen.getByRole("button", { name: "Leave this level" }));
    fireEvent.click(screen.getByRole("button", { name: "Leave level" }));
    expect(onFinish.mock.calls[0][0].taps).toEqual(SPOTS.map((spot, i) => [100 + i * 50, spot.x, spot.y]));
  });

  it("draws each box's number key for mouse and keyboard players", () => {
    renderBoard();
    expect(frameAt(100)).toEqual(PAD);
  });

  it("keeps the boxes plain on a touch screen until a number key is pressed", () => {
    touchScreen();
    const onKeyboard = vi.fn();
    const { board } = renderBoard({ onKeyboard });
    expect(frameAt(100)).toEqual([]);
    fireEvent.keyDown(board, { key: "5" });
    fireEvent.keyDown(board, { key: "6" });
    expect(onKeyboard).toHaveBeenCalledTimes(1);
    expect(frameAt(200)).toEqual(PAD);
  });

  it("shows the numbers from the start on a touch screen once the player has used the keys", () => {
    touchScreen();
    renderBoard({ showKeys: true });
    expect(frameAt(100)).toEqual(PAD);
  });

  it("tells screen readers the time left at 10 and 5 seconds, never every second", () => {
    const { container } = renderBoard();
    expect(listen(container, level1.durationMs)).toEqual(["10 seconds left.", "5 seconds left."]);
  });

  it("gives the first warning exactly 10 seconds before the end", () => {
    const { container } = renderBoard();
    const live = container.querySelector("p[aria-live]")!;
    frameAt(level1.durationMs - 10_001);
    expect(live).toHaveTextContent(/^$/);
    frameAt(level1.durationMs - 10_000);
    expect(live).toHaveTextContent("10 seconds left.");
  });

  it("skips a warning that would come in the level's first three seconds", () => {
    const { container } = renderBoard({ config: { ...level1, durationMs: 10_000 } });
    expect(listen(container, 10_000)).toEqual(["5 seconds left."]);
  });

  it("moves focus into the leave question and back to the board on Keep playing or Escape", () => {
    const { board, onFinish } = renderBoard();
    fireEvent.click(screen.getByRole("button", { name: "Leave this level" }));
    expect(screen.getByRole("dialog", { name: "Leave this level?" })).toBeInTheDocument();
    const keep = screen.getByRole("button", { name: "Keep playing" });
    expect(keep).toHaveFocus();

    // Keys answer the question; they never tap the boxes under it.
    fireEvent.keyDown(keep, { key: "5" });
    fireEvent.keyDown(keep, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(board).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Leave this level" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep playing" }));
    expect(board).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Leave this level" }));
    fireEvent.click(screen.getByRole("button", { name: "Leave level" }));
    expect(onFinish.mock.calls[0][0]).toMatchObject({ aborted: true, taps: [] });
  });
});

describe("GameExperience: starting a level from the keyboard", () => {
  beforeEach(() => {
    installDomMocks({ reducedMotion: true });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ configured: false, signedIn: false }))));
    vi.stubGlobal("ResizeObserver", NoopResizeObserver);
    Object.defineProperty(Element.prototype, "scrollIntoView", { value: vi.fn(), configurable: true, writable: true });
    // Nothing is drawn here: without a canvas context the board's game loop never starts.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null as never);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("lands on the board after the 3-2-1 countdown, ready for the number keys", async () => {
    const user = userEvent.setup();
    render(<GameExperience settings={settings} eventDay={null} couponValueText={null} />);

    screen.getByRole("button", { name: "Practise level 1" }).focus();
    await user.keyboard("{Enter}");
    (await screen.findByRole("button", { name: "Start level 1" }, { timeout: 4000 })).focus();
    await user.keyboard("{Enter}");

    // The real countdown (real timers keep this simple): three ticks of a second each. Under a busy
    // test run the first tick can pass before the first look, so any of the three counts.
    expect(await screen.findByText(/^[321]$/, { selector: "p" }, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.queryByRole("application")).not.toBeInTheDocument();
    expect(await screen.findByRole("application", {}, { timeout: 6000 })).toHaveFocus();
  }, 20_000);
});
