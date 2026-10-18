// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installDomMocks } from "../helpers/dom";

vi.mock("next/image", async () => (await import("../helpers/dom")).nextMocks.image());
vi.mock("next/link", async () => (await import("../helpers/dom")).nextMocks.link());
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

/**
 * Renders each public page with Supabase unconfigured, the way a fresh checkout or a build without
 * secrets would: every page must still render from the defaults.
 */
describe("public routes render without a database", () => {
  beforeEach(() => {
    installDomMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ configured: false, signedIn: false }))));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("homepage: approved headline, the five attractions, diyas, event details", async () => {
    const { default: Page } = await import("@/app/page");
    render(await Page());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Came for the Food. Stayed for the Chaos.");
    for (const name of ["Chocolate Bomb", "Chat Papdi", "Homemade Diyas", "60-Second Brick Challenge", "Catch Koochu Puchu"]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("Tuesday, 27 October 2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Eco-friendly Diwali Mandi 2026/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /Light up/ })).toBeInTheDocument();
    // No big team grid on the homepage.
    expect(screen.queryByText(/Team member 01/)).toBeNull();
  });

  it("menu: food and the diyas section", async () => {
    const { default: Page } = await import("@/app/menu/page");
    render(await Page());
    expect(screen.getByRole("heading", { name: "To eat" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Diwali diyas/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Homemade Diwali Diyas" })).toBeInTheDocument();
  });

  it("challenge: 60 seconds, staff confirmation, draft rules flagged", async () => {
    const { default: Page } = await import("@/app/challenge/page");
    render(Page());
    expect(screen.getByRole("heading", { name: "Only our staff can confirm a result" })).toBeInTheDocument();
    expect(screen.getByText(/cannot see, weigh or time your brick/)).toBeInTheDocument();
    expect(screen.getByText(/Draft rules: waiting for organiser approval/)).toBeInTheDocument();
  });

  it("rules: attempts, coupons, privacy", async () => {
    const { default: Page } = await import("@/app/rules/page");
    render(await Page());
    expect(screen.getByText(/Each phone or browser gets 2 reward/)).toBeInTheDocument();
    expect(screen.getByText(/No sign-up needed: just tap Play for a reward\. Coupons can be won on event day only/)).toBeInTheDocument();
    expect(screen.getByText(/our team redeems only one coupon for each person/)).toBeInTheDocument();
    expect(screen.getByText(/Practice mode is free and unlimited. It never awards coupons./)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your data" })).toBeInTheDocument();
  });

  it("team: the 17 students by group, and the 3 mentors in a compact row", async () => {
    const { default: Page } = await import("@/app/team/page");
    render(await Page());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("The people behind TERRA UTSAV.");
    expect(screen.getByText(/17 students, 7 teams/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Saniya Bhor" })).toBeInTheDocument();
    expect(screen.getByAltText("Photo of Sanket Wakale")).toBeInTheDocument();
    expect(screen.queryByText("Preview slot")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Our mentors" })).toBeInTheDocument();
    for (const name of ["Ankush", "Jidnyesh", "Sairaj"]) expect(screen.getByAltText(`Photo of ${name}`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause the photo switching" })).toBeInTheDocument();
    expect(screen.getByText(/Want your photo changed or removed/)).toBeInTheDocument();
  });

  it("game: practice available, reward play explains sign-in is not switched on", async () => {
    const { default: Page } = await import("@/app/game/page");
    render(await Page());
    expect(screen.getByRole("button", { name: "Practise level 1" })).toBeInTheDocument();
    expect(await screen.findByText(/Reward play isn't switched on yet/)).toBeInTheDocument();
  });
});
