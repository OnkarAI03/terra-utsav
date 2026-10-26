import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_GAME_SETTINGS } from "@/lib/game/config";
import { as, backdateLevel, createTestDb, createUser, grantRole, openEventWindow, serviceCall, userCall } from "./harness";

type Json = Record<string, unknown>;

let db: PGlite;
let alice: string;
let bob: string;
let staff: string;
let admin: string;
let aliceCoupon: string;

beforeAll(async () => {
  db = await createTestDb();
  alice = await createUser(db, "alice@student.test");
  bob = await createUser(db, "bob@student.test");
  staff = await createUser(db, "staff@stall.test");
  admin = await createUser(db, "admin@stall.test");
  await grantRole(db, staff, "staff");
  await grantRole(db, admin, "admin");

  // Alice wins a coupon (reward play is open once the organisers confirm the coupon terms).
  await db.query("update public.site_settings set value = value || $1::jsonb where key = 'rewards'", [{ rewardsEnabled: true, confirmed: true }]);
  await openEventWindow(db);
  const a = await serviceCall<Json>(db, "public.game_start_attempt($1)", [alice]);
  const levels = DEFAULT_GAME_SETTINGS.levels;
  for (let l = 1; l <= levels.length; l++) {
    await serviceCall(db, "public.game_start_level($1, $2, $3, $4)", [alice, a.attemptId, l, 99]);
    await backdateLevel(db, a.attemptId as string, l, 20_000);
    const target = levels[l - 1].targetCatches;
    const r = await serviceCall<Json>(db, "public.game_submit_level($1, $2, $3, $4, $5, $6, $7, $8, $9)", [
      alice,
      a.attemptId,
      l,
      "passed",
      target,
      0,
      target,
      19_000,
      {},
    ]);
    if (l === levels.length) aliceCoupon = (r.coupon as Json).code as string;
  }
  // Team data: one visible member without photo consent, one hidden member. The seeded roster
  // is cleared first so the counts below only see these two fixtures.
  await db.exec(`
    delete from public.team_members;
    delete from public.team_groups;
    insert into public.team_groups (slug, name, mascot_variant) values ('kitchen', 'Kitchen', 'food');
    insert into public.team_members (slug, name, title, group_id, photo_url, photo_consent, visible)
      select 'real-person', 'Real Person', 'Cook', id, '/photo.webp', false, true from public.team_groups where slug = 'kitchen';
    insert into public.team_members (slug, name, title, photo_url, photo_consent, visible)
      values ('hidden-person', 'Hidden Person', 'Helper', '/hidden.webp', true, false);
    update public.products set availability = 'hidden' where slug = 'aloo-ponga';
  `);
});

const select = (role: "anon" | "authenticated", user: string | null, sql: string, params: unknown[] = []) =>
  as(db, role, user, async (tx) => (await tx.query<Json>(sql, params)).rows);

describe("students", () => {
  it("see only their own coupons and attempts", async () => {
    expect(await select("authenticated", alice, "select code from public.coupons")).toHaveLength(1);
    expect(await select("authenticated", bob, "select code from public.coupons")).toHaveLength(0);
    expect(await select("authenticated", bob, "select id from public.game_attempts")).toHaveLength(0);
    expect(await select("authenticated", bob, "select level from public.game_attempt_levels")).toHaveLength(0);
    expect((await select("authenticated", alice, "select level from public.game_attempt_levels")).length).toBe(DEFAULT_GAME_SETTINGS.levels.length);
  });

  it("cannot create or change coupons, attempts or roles", async () => {
    await expect(
      select("authenticated", bob, "insert into public.coupons (code, user_id, attempt_id, label) values ('TU-AAAAA-AAAAA', $1, gen_random_uuid(), 'x')", [bob]),
    ).rejects.toThrow(/permission denied|row-level security/);
    await expect(
      select("authenticated", alice, "update public.coupons set status = 'issued', redemption_count = 0"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      select("authenticated", bob, "insert into public.game_attempts (user_id, attempt_number, settings_snapshot) values ($1, 1, '{}')", [bob]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      select("authenticated", bob, "insert into public.user_roles (user_id, role) values ($1, 'admin')", [bob]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      select("authenticated", bob, "update public.player_state set bonus_attempts = 10 where user_id = $1", [bob]),
    ).rejects.toThrow(/permission denied/);
  });

  it("cannot call the game functions directly", async () => {
    await expect(
      select("authenticated", bob, "select public.game_start_attempt($1)", [bob]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      select("authenticated", bob, "select public.game_submit_level($1, gen_random_uuid(), 5, 'passed', 99, 0, 99, 0, '{}')", [bob]),
    ).rejects.toThrow(/permission denied/);
  });

  it("can change their display name but not their email", async () => {
    await select("authenticated", bob, "update public.profiles set display_name = 'Bobby' where id = $1", [bob]);
    const r = await db.query<{ display_name: string }>("select display_name from public.profiles where id = $1", [bob]);
    expect(r.rows[0].display_name).toBe("Bobby");
    await expect(
      select("authenticated", bob, "update public.profiles set email = 'admin@stall.test' where id = $1", [bob]),
    ).rejects.toThrow(/permission denied/);
  });

  it("cannot read other students' profiles or the audit log", async () => {
    expect(await select("authenticated", bob, "select email from public.profiles")).toHaveLength(1);
    expect(await select("authenticated", bob, "select id from public.audit_log")).toHaveLength(0);
  });

  it("cannot use admin functions", async () => {
    await expect(userCall(db, bob, "public.admin_set_role($1, 'admin', true)", ["bob@student.test"])).rejects.toThrow(/forbidden/);
    await expect(userCall(db, bob, "public.admin_stats()", [])).rejects.toThrow(/forbidden/);
  });
});

describe("the public", () => {
  it("can read listed products and settings but not hidden products", async () => {
    const products = await select("anon", null, "select slug from public.products");
    expect(products.map((p) => p.slug)).toEqual(["chocolate-bomb", "diwali-diyas"]);
    expect(await select("anon", null, "select key from public.site_settings")).toHaveLength(3);
  });

  it("cannot read the private team table, only the public view", async () => {
    expect(await select("anon", null, "select id from public.team_members")).toHaveLength(0);
    const team = await select("anon", null, "select slug, photo_url, mascot_variant from public.team_members_public");
    expect(team).toEqual([{ slug: "real-person", photo_url: null, mascot_variant: "food" }]);
  });

  it("cannot read coupons, attempts or profiles", async () => {
    expect(await select("anon", null, "select id from public.coupons")).toHaveLength(0);
    expect(await select("anon", null, "select id from public.game_attempts")).toHaveLength(0);
    expect(await select("anon", null, "select id from public.profiles")).toHaveLength(0);
  });

  it("cannot write settings", async () => {
    await expect(select("anon", null, "update public.site_settings set value = '{}'")).rejects.toThrow(/permission denied/);
  });
});

describe("staff", () => {
  it("cannot browse coupons, only look them up by code", async () => {
    expect(await select("authenticated", staff, "select id from public.coupons")).toHaveLength(0);
    const r = await userCall<Json>(db, staff, "public.coupon_lookup($1)", [aliceCoupon]);
    expect(r.status).toBe("valid");
  });

  it("cannot edit the menu or grant roles", async () => {
    await select("authenticated", staff, "update public.products set name = 'Hacked'");
    const r = await db.query<{ name: string }>("select name from public.products where slug = 'chocolate-bomb'");
    expect(r.rows[0].name).toBe("Chocolate Bomb");
    await expect(userCall(db, staff, "public.admin_set_role($1, 'admin', true)", ["staff@stall.test"])).rejects.toThrow(/forbidden/);
  });

  it("can record brick challenge results under their own name only", async () => {
    await select("authenticated", staff, "insert into public.challenge_results (held_seconds, completed, recorded_by) values (60, true, $1)", [staff]);
    await expect(
      select("authenticated", staff, "insert into public.challenge_results (held_seconds, completed, recorded_by) values (60, true, $1)", [admin]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      select("authenticated", alice, "insert into public.challenge_results (held_seconds, completed, recorded_by) values (60, true, $1)", [alice]),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("admins", () => {
  it("can edit the menu, and the change is audited", async () => {
    await select("authenticated", admin, "update public.products set price_paise = 9900 where slug = 'chocolate-bomb'");
    const r = await db.query<{ price_paise: number }>("select price_paise from public.products where slug = 'chocolate-bomb'");
    expect(r.rows[0].price_paise).toBe(9900);
    const audit = await db.query<{ actor_id: string; details: Json }>(
      "select actor_id, details from public.audit_log where entity = 'products' and action = 'update' order by id desc limit 1",
    );
    expect(audit.rows[0].actor_id).toBe(admin);
    expect(audit.rows[0].details).toEqual({ price_paise: 9900 });
  });

  it("see hidden products and every team member", async () => {
    expect(await select("authenticated", admin, "select slug from public.products")).toHaveLength(3);
    expect(await select("authenticated", admin, "select slug from public.team_members")).toHaveLength(2);
  });

  it("grant and revoke staff by email, but cannot remove their own admin role", async () => {
    const granted = await userCall<Json>(db, admin, "public.admin_set_role($1, 'staff', true)", ["BOB@student.test"]);
    expect(granted.ok).toBe(true);
    expect(await userCall(db, bob, "public.is_staff()", [])).toBe(true);
    await userCall(db, admin, "public.admin_set_role($1, 'staff', false)", ["bob@student.test"]);
    expect(await userCall(db, bob, "public.is_staff()", [])).toBe(false);

    const self = await userCall<Json>(db, admin, "public.admin_set_role($1, 'admin', false)", ["admin@stall.test"]);
    expect(self.error).toBe("cannot_remove_own_admin");
    const missing = await userCall<Json>(db, admin, "public.admin_set_role($1, 'staff', true)", ["nobody@x.test"]);
    expect(missing.error).toBe("user_not_found");
  });

  it("see statistics", async () => {
    const stats = await userCall<Json>(db, admin, "public.admin_stats()", []);
    expect(stats.wins).toBe(1);
    expect(stats.couponsIssued).toBe(1);
  });

  it("can void an unused coupon", async () => {
    const r = await userCall<Json>(db, admin, "public.admin_void_coupon($1)", [aliceCoupon]);
    expect(r.ok).toBe(true);
    const look = await userCall<Json>(db, staff, "public.coupon_lookup($1)", [aliceCoupon]);
    expect(look.status).toBe("void");
  });
});
