import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_GAME_SETTINGS } from "@/lib/game/config";
import { generateSchedule, positionAt } from "@/lib/game/engine";

// ---------------------------------------------------------------- mocks
const state = {
  user: null as { id: string; email: string; email_confirmed_at?: string; is_anonymous?: boolean } | null,
  roles: [] as string[],
  rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
  attempt: { id: "11111111-1111-4111-8111-111111111111", user_id: "u1", status: "in_progress", current_level: 1, settings_snapshot: DEFAULT_GAME_SETTINGS },
  levelSeed: 4242,
};

function sessionClient() {
  return {
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    from: (table: string) => ({
      select: () => ({
        eq: async () => ({ data: table === "user_roles" ? state.roles.map((role) => ({ role })) : [], error: null }),
      }),
      upsert: async () => ({ error: null }),
    }),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.rpcCalls.push({ fn, args });
      return { data: { ok: true }, error: null };
    },
  };
}

function serviceClient() {
  return {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.rpcCalls.push({ fn, args });
      if (fn === "rate_limit_hit") return { data: true, error: null };
      if (fn === "game_submit_level") return { data: { outcome: args.p_outcome, attemptStatus: args.p_outcome === "passed" ? "in_progress" : "lost", nextLevel: 2 }, error: null };
      return { data: {}, error: null };
    },
    from: (table: string) => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () =>
          table === "game_attempts"
            ? { data: state.attempt, error: null }
            : { data: { seed: state.levelSeed, submitted_at: null }, error: null },
      };
      return builder;
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => sessionClient() }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseServiceClient: () => serviceClient() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

beforeEach(() => {
  state.user = null;
  state.roles = [];
  state.rpcCalls = [];
});

const jsonRequest = (url: string, body: unknown, origin = "http://localhost:3000") =>
  new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", origin, host: "localhost:3000" },
    body: JSON.stringify(body),
  });

// ---------------------------------------------------------------- helpers
describe("safe redirects after sign-in", () => {
  it("only allows same-site paths", async () => {
    const { safeNextPath } = await import("@/lib/auth");
    expect(safeNextPath("/rewards")).toBe("/rewards");
    expect(safeNextPath("/admin/menu")).toBe("/admin/menu");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath("/api/game/attempt")).toBe("/");
    expect(safeNextPath(null, "/rewards")).toBe("/rewards");
  });
});

// ---------------------------------------------------------------- game API
describe("game API trusts only the server's own judgement", () => {
  it("refuses players who are not signed in", async () => {
    const { POST } = await import("@/app/api/game/attempt/route");
    const res = await POST(jsonRequest("http://localhost:3000/api/game/attempt", {}));
    expect(res.status).toBe(401);
  });

  it("refuses players whose email is not verified, and anonymous sessions", async () => {
    const { POST } = await import("@/app/api/game/attempt/route");
    state.user = { id: "u1", email: "u1@x.test" };
    expect((await POST(jsonRequest("http://localhost:3000/api/game/attempt", {}))).status).toBe(401);
    state.user = { id: "u1", email: "u1@x.test", email_confirmed_at: "2026-10-18T00:00:00Z", is_anonymous: true };
    expect((await POST(jsonRequest("http://localhost:3000/api/game/attempt", {}))).status).toBe(401);
  });

  it("refuses cross-site requests", async () => {
    state.user = { id: "u1", email: "u1@x.test", email_confirmed_at: "2026-10-18T00:00:00Z" };
    const { POST } = await import("@/app/api/game/attempt/route");
    const res = await POST(jsonRequest("http://localhost:3000/api/game/attempt", {}, "https://evil.example"));
    expect(res.status).toBe(400);
  });

  it("ignores any score or success flag sent by the browser and replays the taps itself", async () => {
    state.user = { id: "u1", email: "u1@x.test", email_confirmed_at: "2026-10-18T00:00:00Z" };
    const { POST } = await import("@/app/api/game/level/submit/route");
    const res = await POST(
      jsonRequest("http://localhost:3000/api/game/level/submit", {
        attemptId: state.attempt.id,
        level: 1,
        taps: [[1000, 0.5, 0.5]],
        outcome: "passed",
        catches: 99,
        won: true,
      }),
    );
    expect(res.status).toBe(200);
    const submitted = state.rpcCalls.find((c) => c.fn === "game_submit_level")!;
    expect(submitted.args.p_outcome).toBe("failed_time");
    expect(submitted.args.p_catches).toBeLessThan(DEFAULT_GAME_SETTINGS.levels[0].targetCatches);
  });

  it("passes a level only when the replayed taps really catch enough kittens", async () => {
    state.user = { id: "u1", email: "u1@x.test", email_confirmed_at: "2026-10-18T00:00:00Z" };
    const cfg = DEFAULT_GAME_SETTINGS.levels[0];
    const taps = generateSchedule(state.levelSeed, cfg)
      .filter((s) => s.kind === "cat")
      .map((s) => {
        const t = s.appearAt + 300;
        const p = positionAt(s, t);
        return [t, p.x, p.y];
      });
    const { POST } = await import("@/app/api/game/level/submit/route");
    const res = await POST(jsonRequest("http://localhost:3000/api/game/level/submit", { attemptId: state.attempt.id, level: 1, taps }));
    expect(res.status).toBe(200);
    const submitted = state.rpcCalls.find((c) => c.fn === "game_submit_level")!;
    expect(submitted.args.p_outcome).toBe("passed");
    expect(submitted.args.p_catches).toBe(cfg.targetCatches);
  });

  it("rejects another player's attempt", async () => {
    state.user = { id: "someone-else", email: "x@x.test", email_confirmed_at: "2026-10-18T00:00:00Z" };
    const { POST } = await import("@/app/api/game/level/submit/route");
    const res = await POST(jsonRequest("http://localhost:3000/api/game/level/submit", { attemptId: state.attempt.id, level: 1, taps: [] }));
    expect(res.status).toBe(404);
  });

  it("rejects malformed or oversized tap logs", async () => {
    state.user = { id: "u1", email: "u1@x.test", email_confirmed_at: "2026-10-18T00:00:00Z" };
    const { POST } = await import("@/app/api/game/level/submit/route");
    const bad = await POST(jsonRequest("http://localhost:3000/api/game/level/submit", { attemptId: "not-a-uuid", level: 1, taps: [] }));
    expect(bad.status).toBe(400);
    const tooMany = Array.from({ length: 700 }, (_, i) => [i * 10, 0.5, 0.5]);
    const huge = await POST(jsonRequest("http://localhost:3000/api/game/level/submit", { attemptId: state.attempt.id, level: 1, taps: tooMany }));
    expect(huge.status).toBe(400);
  });
});

// ---------------------------------------------------------------- admin
describe("admin actions", () => {
  it("refuse signed-in users who are not admins", async () => {
    state.user = { id: "u1", email: "u1@x.test", email_confirmed_at: "2026-10-18T00:00:00Z" };
    state.roles = ["staff"];
    const { saveEvent, setRole } = await import("@/app/admin/actions");
    const fd = new FormData();
    fd.set("festivalName", "Hacked");
    expect(await saveEvent(null, fd)).toEqual({ ok: false, message: "Admins only." });
    const roleFd = new FormData();
    roleFd.set("email", "u1@x.test");
    roleFd.set("role", "admin");
    expect(await setRole(null, roleFd)).toEqual({ ok: false, message: "Admins only." });
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("refuse anonymous visitors", async () => {
    const { saveRewards } = await import("@/app/admin/actions");
    expect(await saveRewards(null, new FormData())).toEqual({ ok: false, message: "Please sign in again." });
  });

  it("validate input before saving, for admins", async () => {
    state.user = { id: "a1", email: "admin@x.test" };
    state.roles = ["admin"];
    const { saveGame } = await import("@/app/admin/actions");
    const fd = new FormData();
    // Levels must be numbered from 1 in order: a game that starts at level 2 is refused.
    fd.set("settings", JSON.stringify({ ...DEFAULT_GAME_SETTINGS, levels: DEFAULT_GAME_SETTINGS.levels.slice(1) }));
    const res = await saveGame(null, fd);
    expect(res?.ok).toBe(false);
  });
});

describe("staff actions", () => {
  it("refuse students", async () => {
    state.user = { id: "u1", email: "u1@x.test", email_confirmed_at: "2026-10-18T00:00:00Z" };
    const { redeemCoupon } = await import("@/app/staff/actions");
    const res = await redeemCoupon("TU-AAAAA-AAAAA");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/staff access/);
    expect(state.rpcCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------- middleware
describe("middleware", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.doMock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }) }));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@supabase/ssr");
    vi.resetModules();
  });

  it("sends signed-out visitors from private pages to sign in", async () => {
    const { middleware } = await import("@/middleware");
    for (const path of ["/admin", "/admin/menu", "/staff/redeem", "/rewards"]) {
      const res = await middleware(new NextRequest(`http://localhost:3000${path}`));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`http://localhost:3000/login?next=${encodeURIComponent(path)}`);
    }
  });

  it("lets signed-out visitors play practice and sign in", async () => {
    const { middleware } = await import("@/middleware");
    for (const path of ["/game", "/login"]) {
      const res = await middleware(new NextRequest(`http://localhost:3000${path}`));
      expect(res.headers.get("location")).toBeNull();
    }
  });
});

// ---------------------------------------------------------------- SEO
describe("search engine rules", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("blocks indexing on preview deployments", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const { default: robots } = await import("@/app/robots");
    expect(robots().rules).toEqual([{ userAgent: "*", disallow: "/" }]);
  });

  it("allows public pages on production but keeps private areas out", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const { default: robots } = await import("@/app/robots");
    const rules = robots().rules as { disallow: string[] }[];
    expect(rules[0].disallow).toEqual(expect.arrayContaining(["/admin", "/staff", "/rewards"]));
  });

  it("only describes the event to search engines once it is confirmed", async () => {
    const { eventJsonLd } = await import("@/lib/seo");
    const { DEFAULT_EVENT } = await import("@/lib/settings");
    expect(eventJsonLd({ ...DEFAULT_EVENT, confirmed: false })).toBeNull();
    const ld = eventJsonLd(DEFAULT_EVENT)!;
    expect(ld.startDate).toBe("2026-10-27T09:00:00+05:30");
    expect(ld.endDate).toBe("2026-10-27T15:00:00+05:30");
    expect(ld.location.address).toContain("S. B. Patil Institute of Management");
    expect(ld.organizer.sameAs).toEqual(["https://www.instagram.com/pcet_terra_utsav"]);
  });
});
