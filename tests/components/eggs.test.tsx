// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stored = () => JSON.parse(localStorage.getItem("tu-mystery-eggs") ?? "[]") as string[];

describe("mystery eggs", () => {
  beforeEach(() => {
    localStorage.clear();
    // The store keeps a module-level cache; start every test from a fresh module.
    vi.resetModules();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("finds each egg once, remembers it in this browser and announces it", async () => {
    const { findEgg } = await import("@/components/eggs/store");
    const found: unknown[] = [];
    const listener = (e: Event) => found.push((e as CustomEvent).detail);
    window.addEventListener("tu:egg", listener);
    expect(findEgg("wordmark")).toBe(true);
    expect(findEgg("wordmark")).toBe(false);
    window.removeEventListener("tu:egg", listener);
    expect(found).toEqual([{ id: "wordmark", count: 1, total: 4 }]);
    expect(stored()).toEqual(["wordmark"]);
  });

  it("counts finds in the footer and hands out hints for the rest", async () => {
    const { EggCounter } = await import("@/components/eggs/EggCounter");
    const { findEgg } = await import("@/components/eggs/store");
    render(<EggCounter />);
    expect(screen.getByText("4 mystery eggs are hidden on this site. Found: 0 of 4.")).toBeInTheDocument();
    act(() => {
      findEgg("paw", "peek");
    });
    expect(screen.getByText("4 mystery eggs are hidden on this site. Found: 1 of 4.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Need a hint?" }));
    expect(screen.getByText(/Five little flames/)).toBeInTheDocument();
  });

  it("lighting all five hero diyas finds the diya egg", async () => {
    vi.useFakeTimers();
    const { HeroDiyas } = await import("@/components/eggs/Triggers");
    render(<HeroDiyas />);
    const diyas = screen.getAllByRole("button", { name: /^Diya \d$/ });
    expect(diyas).toHaveLength(5);
    for (const d of diyas) fireEvent.click(d);
    for (const d of diyas) expect(d).toHaveAttribute("aria-pressed", "true");
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(stored()).toContain("diyas");
  });

  it("the footer name is ticklish", async () => {
    const { TicklishWordmark } = await import("@/components/eggs/Triggers");
    render(<TicklishWordmark />);
    fireEvent.click(screen.getByRole("button", { name: /TERRA UTSAV/ }));
    expect(stored()).toContain("wordmark");
  });
});
