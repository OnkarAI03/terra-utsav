import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_PRODUCTS } from "@/content/products";
import { DEFAULT_GAME_SETTINGS } from "@/lib/game/config";
import { DEFAULT_EVENT, DEFAULT_REWARDS } from "@/lib/settings";
import { createTestDb } from "./harness";

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
});

describe("migrations", () => {
  it("apply cleanly to an empty database", async () => {
    const r = await db.query<{ n: number }>(
      "select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'",
    );
    expect(r.rows[0].n).toBeGreaterThanOrEqual(14);
  });

  it("enable row level security on every public table", async () => {
    const r = await db.query<{ tablename: string; rowsecurity: boolean }>(
      "select tablename, rowsecurity from pg_tables where schemaname = 'public'",
    );
    const off = r.rows.filter((t) => !t.rowsecurity).map((t) => t.tablename);
    expect(off).toEqual([]);
  });

  it("seed game settings identical to the code defaults", async () => {
    const r = await db.query<{ value: unknown }>("select value from public.site_settings where key = 'game'");
    expect(r.rows[0].value).toEqual(DEFAULT_GAME_SETTINGS);
  });

  it("seed event and reward settings identical to the code defaults", async () => {
    const ev = await db.query<{ value: unknown }>("select value from public.site_settings where key = 'event'");
    const rw = await db.query<{ value: unknown }>("select value from public.site_settings where key = 'rewards'");
    expect(ev.rows[0].value).toEqual(DEFAULT_EVENT);
    expect(rw.rows[0].value).toEqual(DEFAULT_REWARDS);
  });

  it("seed the same menu as the code fallback, with no invented prices", async () => {
    const r = await db.query<{ slug: string; name: string; tagline: string; price_paise: number | null; image_url: string }>(
      "select slug, name, tagline, price_paise, image_url from public.products order by sort_order",
    );
    expect(r.rows.map((p) => p.slug)).toEqual(DEFAULT_PRODUCTS.map((p) => p.slug));
    expect(r.rows.map((p) => p.name)).toEqual(DEFAULT_PRODUCTS.map((p) => p.name));
    expect(r.rows.map((p) => p.tagline)).toEqual(DEFAULT_PRODUCTS.map((p) => p.tagline));
    expect(r.rows.every((p) => p.price_paise === null)).toBe(true);
  });

  it("do not let students or anonymous callers run the game-state functions", async () => {
    const fns = [
      "public.game_start_attempt(uuid)",
      "public.game_start_level(uuid, uuid, int, bigint)",
      "public.game_submit_level(uuid, uuid, int, text, int, int, int, int, jsonb)",
      "public.rate_limit_hit(text, int, int)",
      "public.generate_coupon_code()",
    ];
    for (const fn of fns) {
      for (const role of ["anon", "authenticated"]) {
        const r = await db.query<{ ok: boolean }>(`select has_function_privilege($1, $2, 'execute') as ok`, [role, fn]);
        expect(r.rows[0].ok, `${role} can execute ${fn}`).toBe(false);
      }
      const s = await db.query<{ ok: boolean }>(`select has_function_privilege('service_role', $1, 'execute') as ok`, [fn]);
      if (fn !== "public.generate_coupon_code()") expect(s.rows[0].ok).toBe(true);
    }
  });

  it("generate coupon codes in the expected unambiguous format", async () => {
    const codes = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const r = await db.query<{ code: string }>("select public.generate_coupon_code() as code");
      expect(r.rows[0].code).toMatch(/^TU-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/);
      codes.add(r.rows[0].code);
    }
    expect(codes.size).toBe(200);
  });

  it("normalise what staff type into the canonical code", async () => {
    const cases: [string, string | null][] = [
      ["tu-7k9m2-x4p0d", "TU-7K9M2-X4P0D"],
      ["7K9M2 X4POD", "TU-7K9M2-X4P0D"],
      ["TU7K9M2X4P0D", "TU-7K9M2-X4P0D"],
      ["TU-7K9M2", null],
      ["", null],
      ["DROP TABLE coupons", null],
    ];
    for (const [input, expected] of cases) {
      const r = await db.query<{ code: string | null }>("select public.normalize_coupon_code($1) as code", [input]);
      expect(r.rows[0].code).toBe(expected);
    }
  });
});
