// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installDomMocks } from "../helpers/dom";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("next/image", async () => (await import("../helpers/dom")).nextMocks.image());
vi.mock("next/link", async () => (await import("../helpers/dom")).nextMocks.link());

import { KoochuChat } from "@/components/chat/KoochuChat";

describe("Koochu Puchu chat", () => {
  beforeEach(() => {
    pathname = "/";
    installDomMocks();
    Element.prototype.scrollTo = vi.fn();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens with a greeting, answers a suggested question and closes with Escape", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ topic: "when", text: "Eco-friendly Diwali Mandi 2026 is on Tuesday, 27 October 2026, 9 am to 3 pm.", links: [{ label: "Find us card", href: "/#find-us" }], chips: [] }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    render(<KoochuChat />);

    const launcher = screen.getByRole("button", { name: "Ask Koochu Puchu" });
    fireEvent.click(launcher);
    expect(screen.getByRole("dialog", { name: "Koochu Puchu" })).toBeInTheDocument();
    expect(screen.getByText(/I'm Koochu Puchu, the TERRA UTSAV kitten/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "When and where?" }));
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/koochu", expect.objectContaining({ method: "POST", body: JSON.stringify({ question: "When and where?" }) }));
    expect(screen.getByText(/27 October 2026, 9 am to 3 pm/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Find us card" })).toHaveAttribute("href", "/#find-us");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says so when it cannot reach its notes", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    render(<KoochuChat />);
    fireEvent.click(screen.getByRole("button", { name: "Ask Koochu Puchu" }));
    const box = screen.getByRole("textbox", { name: "Ask Koochu Puchu a question" });
    fireEvent.change(box, { target: { value: "menu?" } });
    await act(async () => {
      fireEvent.submit(box.closest("form")!);
    });
    expect(screen.getByText(/can't reach my notes/)).toBeInTheDocument();
  });

  it("stays out of the way on the game, staff and admin pages", () => {
    for (const p of ["/game", "/staff/redeem", "/admin/menu", "/login"]) {
      pathname = p;
      const { unmount } = render(<KoochuChat />);
      expect(screen.queryByRole("button", { name: "Ask Koochu Puchu" }), p).not.toBeInTheDocument();
      unmount();
    }
  });
});
