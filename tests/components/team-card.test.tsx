// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installDomMocks, MockIntersectionObserver } from "../helpers/dom";

vi.mock("next/image", async () => (await import("../helpers/dom")).nextMocks.image());

import { TeamCard } from "@/components/team/TeamCard";
import type { TeamMember } from "@/lib/types";

const member: TeamMember = {
  id: "m1",
  slug: "asha",
  name: "Asha Example",
  title: "Kitchen lead",
  groupId: null,
  kind: "student",
  photoUrl: "/photo.webp",
  mascotUrl: null,
  mascotVariant: "food",
  bio: null,
  links: [],
  sortOrder: 1,
};

const showing = (container: HTMLElement) => container.querySelector("[data-showing]")?.getAttribute("data-showing");

describe("TeamCard photo-to-mascot switching", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts on the photo and switches to the mascot and back while visible", () => {
    installDomMocks();
    const { container } = render(<TeamCard member={member} intervalMs={4000} />);
    expect(showing(container)).toBe("photo");

    act(() => MockIntersectionObserver.triggerAll(true));
    act(() => vi.advanceTimersByTime(4000));
    expect(showing(container)).toBe("mascot");
    act(() => vi.advanceTimersByTime(4000));
    expect(showing(container)).toBe("photo");
  });

  it("does not switch while the card is off screen", () => {
    installDomMocks();
    const { container } = render(<TeamCard member={member} intervalMs={4000} />);
    act(() => vi.advanceTimersByTime(20000));
    expect(showing(container)).toBe("photo");
  });

  it("pauses while hovered and resumes afterwards", () => {
    installDomMocks();
    const { container } = render(<TeamCard member={member} intervalMs={4000} />);
    act(() => MockIntersectionObserver.triggerAll(true));
    const card = container.querySelector("article")!;
    fireEvent.mouseEnter(card);
    act(() => vi.advanceTimersByTime(12000));
    expect(showing(container)).toBe("photo");
    fireEvent.mouseLeave(card);
    act(() => vi.advanceTimersByTime(4000));
    expect(showing(container)).toBe("mascot");
  });

  it("never switches by itself under reduced motion, but the switch button works", () => {
    installDomMocks({ reducedMotion: true });
    const { container } = render(<TeamCard member={member} intervalMs={4000} />);
    act(() => MockIntersectionObserver.triggerAll(true));
    act(() => vi.advanceTimersByTime(20000));
    expect(showing(container)).toBe("photo");

    const toggle = screen.getByRole("button", { name: "Show Asha Example as Koochu Puchu" });
    fireEvent.click(toggle);
    expect(showing(container)).toBe("mascot");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("gives both pictures meaningful names, marking the mascot as an illustration", () => {
    installDomMocks();
    render(<TeamCard member={member} />);
    expect(screen.getByAltText("Photo of Asha Example")).toBeInTheDocument();
    expect(screen.getByAltText(/Illustration: Asha Example as Koochu Puchu, dressed for food and products/)).toBeInTheDocument();
  });
});

describe("TeamCard missing images", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("leads with the mascot when there is no photo, and flips to a labelled placeholder", () => {
    installDomMocks();
    const { container } = render(<TeamCard member={{ ...member, photoUrl: null }} />);
    expect(showing(container)).toBe("mascot");
    const toggle = screen.getByRole("button", { name: "Show Asha Example as Koochu Puchu" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Photo coming soon")).toBeInTheDocument();
    // The accessible picture stays put while the card flips, so a screen reader hears one stable image.
    expect(screen.getByRole("img", { name: /Illustration: Asha Example as Koochu Puchu/ })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Photo of Asha Example coming soon" })).not.toBeInTheDocument();
  });

  it("falls back to the placeholder when the photo fails to load", () => {
    installDomMocks();
    render(<TeamCard member={member} />);
    fireEvent.error(screen.getByAltText("Photo of Asha Example"));
    expect(screen.getByRole("img", { name: "Photo of Asha Example coming soon" })).toBeInTheDocument();
  });

  it("falls back to the outfit drawing when a personal mascot image fails", () => {
    installDomMocks();
    const { container } = render(<TeamCard member={{ ...member, mascotUrl: "/custom.webp" }} />);
    const custom = container.querySelector('img[src="/custom.webp"]')!;
    fireEvent.error(custom);
    expect(container.querySelector('img[src="/images/mascot/koochu-idle-cream.webp"]')).not.toBeNull();
  });

  it("labels preview slots so they are never mistaken for real people", () => {
    installDomMocks();
    render(<TeamCard member={{ ...member, isPlaceholder: true }} />);
    expect(screen.getByText("Preview slot")).toBeInTheDocument();
  });
});
