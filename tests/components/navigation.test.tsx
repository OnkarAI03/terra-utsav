// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installDomMocks } from "../helpers/dom";

vi.mock("next/link", async () => (await import("../helpers/dom")).nextMocks.link());
vi.mock("next/navigation", () => ({ usePathname: () => "/menu" }));

import { MobileMenu } from "@/components/site/MobileMenu";
import { NavLinks } from "@/components/site/NavLinks";
import { MAIN_NAV } from "@/lib/nav";

describe("navigation", () => {
  beforeEach(() => installDomMocks());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lists every main route with the current page marked", () => {
    render(<NavLinks items={MAIN_NAV} />);
    for (const item of MAIN_NAV) expect(screen.getByRole("link", { name: item.label })).toHaveAttribute("href", item.href);
    expect(screen.getByRole("link", { name: "Menu" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("keeps Meet the Team as a link, not a homepage section", () => {
    render(<NavLinks items={MAIN_NAV} />);
    expect(screen.getByRole("link", { name: "Meet the Team" })).toHaveAttribute("href", "/team");
  });

  it("opens and closes the mobile menu with the button and Escape", () => {
    render(<MobileMenu items={MAIN_NAV} />);
    const button = screen.getByRole("button", { name: "Open menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Close menu", expanded: true })).toBeInTheDocument();
    const dialog = screen.getByRole("dialog", { name: "Site menu" });
    expect(within(dialog).getByRole("link", { name: "Catch Mini" })).toHaveAttribute("href", "/game");
    expect(within(dialog).getByRole("link", { name: "My prize" })).toHaveAttribute("href", "/rewards");
    expect(document.body.style.overflow).toBe("hidden");
    // The dialog carries its own close button, since a screen reader can't reach the header's X.
    expect(within(dialog).getByRole("button", { name: "Close menu" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
  });
});
