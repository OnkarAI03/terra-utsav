// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveCountdown } from "@/components/home/LiveCountdown";
import { eventPhase, minutesText, shortTime } from "@/lib/countdown";

const START = "2026-10-27T09:00:00+05:30";
const END = "2026-10-27T15:00:00+05:30";
const at = (iso: string) => Date.parse(iso);

describe("where the Mandi stands", () => {
  it("counts down to the start, then is open until the end, then over", () => {
    expect(eventPhase(START, END, at("2026-10-26T08:30:15+05:30"))).toEqual({ phase: "before", days: 1, hours: 0, minutes: 29, seconds: 45 });
    expect(eventPhase(START, END, at("2026-10-27T08:59:59+05:30"))).toEqual({ phase: "before", days: 0, hours: 0, minutes: 0, seconds: 1 });
    expect(eventPhase(START, END, at("2026-10-27T09:00:00+05:30"))).toEqual({ phase: "open", leftMinutes: 360 });
    expect(eventPhase(START, END, at("2026-10-27T14:59:30+05:30"))).toEqual({ phase: "open", leftMinutes: 1 });
    expect(eventPhase(START, END, at("2026-10-27T15:00:00+05:30"))).toEqual({ phase: "over" });
  });

  it("knows nothing without a start, and assumes 8 hours without a sensible end", () => {
    expect(eventPhase(null, END, Date.now())).toBeNull();
    expect(eventPhase("not a date", END, Date.now())).toBeNull();
    expect(eventPhase(START, null, at("2026-10-27T16:59:00+05:30"))).toEqual({ phase: "open", leftMinutes: 1 });
    expect(eventPhase(START, "2026-10-27T08:00:00+05:30", at("2026-10-27T17:01:00+05:30"))).toEqual({ phase: "over" });
  });

  it("writes times the way people say them", () => {
    expect(shortTime(END)).toBe("3 pm");
    expect(shortTime("2026-10-27T17:30:00+05:30")).toBe("5:30 pm");
    expect(minutesText(134)).toBe("2h 14m");
    expect(minutesText(45)).toBe("45m");
  });
});

describe("LiveCountdown", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("ticks every second before the start and switches to open", () => {
    vi.useFakeTimers({ now: at("2026-10-27T08:59:58+05:30") });
    render(<LiveCountdown startsAt={START} endsAt={END} />);
    expect(screen.getByRole("timer")).toHaveTextContent("Opens in 00h 00m 02s");
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("timer")).toHaveTextContent("Opens in 00h 00m 01s");
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText(/Open now/)).toHaveTextContent("Open now · until 3 pm");
  });

  it("shows the board with days to go, and a thank-you once it is over", () => {
    vi.useFakeTimers({ now: at("2026-10-25T09:00:00+05:30") });
    render(<LiveCountdown startsAt={START} endsAt={END} variant="board" />);
    expect(screen.getByText("The Mandi opens in")).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("02Days00Hours00Minutes00Seconds");
    cleanup();
    vi.setSystemTime(at("2026-10-27T15:30:00+05:30"));
    render(<LiveCountdown startsAt={START} endsAt={END} variant="board" />);
    expect(screen.getByText(/That's a wrap/)).toBeInTheDocument();
  });
});
