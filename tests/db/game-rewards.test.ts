import type { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_GAME_SETTINGS } from "@/lib/game/config";
import { as, backdateLevel, createTestDb, createUser, grantRole, serviceCall, userCall } from "./harness";

type Json = Record<string, unknown>;

let db: PGlite;

beforeEach(async () => {
  db = await createTestDb();
});

const startAttempt = (user: string) => serviceCall<Json>(db, "public.game_start_attempt($1)", [user]);
const startLevel = (user: string, attempt: string, level: number, seed = 1234) =>
  serviceCall<Json>(db, "public.game_start_level($1, $2, $3, $4)", [user, attempt, level, seed]);
const submit = (user: string, attempt: string, level: number, outcome: string, catches: number, gameTimeMs = 0) =>
  serviceCall<Json>(db, "public.game_submit_level($1, $2, $3, $4, $5, $6, $7, $8, $9)", [
    user,
    attempt,
    level,
    outcome,
    catches,
    0,
    catches,
    gameTimeMs,
    {},
  ]);

/** Pass a level honestly: the level "took" 20 s on the server clock and 19 s in the game. */
async function passLevel(user: string, attempt: string, level: number) {
  await startLevel(user, attempt, level);
  await backdateLevel(db, attempt, level, 20_000);
  return submit(user, attempt, level, "passed", DEFAULT_GAME_SETTINGS.levels[level - 1].targetCatches, 19_000);
}

async function winAttempt(user: string) {
  const a = await startAttempt(user);
  const id = a.attemptId as string;
  let last: Json = {};
  for (let l = 1; l <= 5; l++) last = await passLevel(user, id, l);
  return { attemptId: id, result: last };
}

async function loseAttempt(user: string) {
  const a = await startAttempt(user);
  await startLevel(user, a.attemptId as string, 1);
  return submit(user, a.attemptId as string, 1, "failed_time", 2, 30_000);
}

async function setRewards(patch: Json) {
  await db.query("update public.site_settings set value = value || $1::jsonb where key = 'rewards'", [patch]);
}

describe("reward attempts", () => {
  it("creates one attempt and resumes it instead of creating a second", async () => {
    const u = await createUser(db, "a@student.test");
    const first = await startAttempt(u);
    const again = await startAttempt(u);
    expect(first.attemptNumber).toBe(1);
    expect(again.resumed).toBe(true);
    expect(again.attemptId).toBe(first.attemptId);
    const n = await db.query<{ n: number }>("select count(*)::int as n from public.game_attempts where user_id = $1", [u]);
    expect(n.rows[0].n).toBe(1);
  });

  it("handles two simultaneous start requests without creating two attempts", async () => {
    const u = await createUser(db, "race@student.test");
    const [a, b] = await Promise.all([startAttempt(u), startAttempt(u)]);
    expect(a.attemptId).toBe(b.attemptId);
    const n = await db.query<{ n: number }>("select count(*)::int as n from public.game_attempts where user_id = $1", [u]);
    expect(n.rows[0].n).toBe(1);
  });

  it("allows exactly two reward attempts", async () => {
    const u = await createUser(db, "b@student.test");
    await loseAttempt(u);
    await loseAttempt(u);
    const third = await startAttempt(u);
    expect(third.error).toBe("no_attempts_left");
    expect(third.attemptsUsed).toBe(2);
    expect(third.attemptsAllowed).toBe(2);
  });

  it("respects bonus attempts granted by an admin", async () => {
    const u = await createUser(db, "c@student.test");
    await loseAttempt(u);
    await loseAttempt(u);
    await db.query("update public.player_state set bonus_attempts = 1 where user_id = $1", [u]);
    const third = await startAttempt(u);
    expect(third.error).toBeUndefined();
    expect(third.attemptNumber).toBe(3);
  });

  it("requires levels in order and each level once", async () => {
    const u = await createUser(db, "d@student.test");
    const a = await startAttempt(u);
    const id = a.attemptId as string;
    expect((await startLevel(u, id, 2)).error).toBe("wrong_level");
    expect((await startLevel(u, id, 1)).seed).toBe(1234);
    expect((await startLevel(u, id, 1)).error).toBe("level_already_started");
  });

  it("will not let one student play another student's attempt", async () => {
    const owner = await createUser(db, "owner@student.test");
    const thief = await createUser(db, "thief@student.test");
    const a = await startAttempt(owner);
    expect((await startLevel(thief, a.attemptId as string, 1)).error).toBe("attempt_not_found");
  });

  it("rejects a pass that finished faster than real time", async () => {
    const u = await createUser(db, "e@student.test");
    const a = await startAttempt(u);
    const id = a.attemptId as string;
    await startLevel(u, id, 1);
    const r = await submit(u, id, 1, "passed", 8, 25_000);
    expect(r.outcome).toBe("invalid");
    expect(r.attemptStatus).toBe("lost");
  });

  it("rejects a pass below the level target", async () => {
    const u = await createUser(db, "f@student.test");
    const a = await startAttempt(u);
    const id = a.attemptId as string;
    await startLevel(u, id, 1);
    await backdateLevel(db, id, 1, 20_000);
    const r = await submit(u, id, 1, "passed", 3, 19_000);
    expect(r.outcome).toBe("invalid");
  });

  it("refuses results that arrive long after the level ended", async () => {
    const u = await createUser(db, "g@student.test");
    const a = await startAttempt(u);
    const id = a.attemptId as string;
    await startLevel(u, id, 1);
    await backdateLevel(db, id, 1, 10 * 60_000);
    const r = await submit(u, id, 1, "passed", 8, 19_000);
    expect(r.outcome).toBe("abandoned");
  });

  it("counts an abandoned level as a lost attempt", async () => {
    const u = await createUser(db, "h@student.test");
    const a = await startAttempt(u);
    const id = a.attemptId as string;
    await startLevel(u, id, 1);
    // Still within the level's time window: the player must finish it.
    expect((await startAttempt(u)).error).toBe("level_in_progress");
    await backdateLevel(db, id, 1, 5 * 60_000);
    const next = await startAttempt(u);
    expect(next.attemptNumber).toBe(2);
    const old = await db.query<{ status: string }>("select status from public.game_attempts where id = $1", [id]);
    expect(old.rows[0].status).toBe("lost");
  });

  it("ignores a second submission for the same level", async () => {
    const u = await createUser(db, "i@student.test");
    const a = await startAttempt(u);
    const id = a.attemptId as string;
    await passLevel(u, id, 1);
    const replay = await submit(u, id, 1, "passed", 8, 19_000);
    expect(replay.error).toBe("wrong_level");
  });
});

describe("coupon issuance", () => {
  it("issues exactly one coupon for a level 5 win", async () => {
    const u = await createUser(db, "win@student.test");
    const { attemptId, result } = await winAttempt(u);
    expect(result.attemptStatus).toBe("won");
    expect(result.reward).toBe("issued");
    const coupon = result.coupon as Json;
    expect(coupon.code).toMatch(/^TU-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/);

    const replay = await submit(u, attemptId, 5, "passed", 18, 19_000);
    expect(replay.error).toBe("attempt_finished");
    const n = await db.query<{ n: number }>("select count(*)::int as n from public.coupons where attempt_id = $1", [attemptId]);
    expect(n.rows[0].n).toBe(1);
  });

  it("cannot store two coupons for one attempt even by direct insert", async () => {
    const u = await createUser(db, "dup@student.test");
    const { attemptId } = await winAttempt(u);
    await expect(
      db.query(
        "insert into public.coupons (code, user_id, attempt_id, label) values (public.generate_coupon_code(), $1, $2, 'x')",
        [u, attemptId],
      ),
    ).rejects.toThrow(/duplicate key/);
  });

  it("does not issue coupons while rewards are switched off", async () => {
    await setRewards({ rewardsEnabled: false });
    const u = await createUser(db, "off@student.test");
    const { result } = await winAttempt(u);
    expect(result.attemptStatus).toBe("won");
    expect(result.reward).toBe("rewards_disabled");
    expect(result.coupon).toBeNull();
  });

  it("stops issuing when the coupon stock runs out", async () => {
    await setRewards({ maxCouponsTotal: 1 });
    const a = await createUser(db, "first@student.test");
    const b = await createUser(db, "second@student.test");
    expect((await winAttempt(a)).result.reward).toBe("issued");
    expect((await winAttempt(b)).result.reward).toBe("stock_exhausted");
  });

  it("applies the configured expiry", async () => {
    await setRewards({ expiresAfterHours: 6 });
    const u = await createUser(db, "exp@student.test");
    const { result } = await winAttempt(u);
    const expires = new Date((result.coupon as Json).expiresAt as string).getTime();
    const hours = (expires - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(5.9);
    expect(hours).toBeLessThan(6.1);
  });
});

describe("staff redemption", () => {
  async function setup() {
    const student = await createUser(db, "holder@student.test");
    const staff = await createUser(db, "staff@stall.test");
    await grantRole(db, staff, "staff");
    const { result } = await winAttempt(student);
    return { student, staff, code: (result.coupon as Json).code as string };
  }

  it("verifies and redeems a valid coupon once", async () => {
    const { staff, code } = await setup();
    const look = await userCall<Json>(db, staff, "public.coupon_lookup($1)", [code.toLowerCase()]);
    expect(look.status).toBe("valid");
    expect(look.holder).toBe("ho***@student.test");

    const first = await userCall<Json>(db, staff, "public.coupon_redeem($1, null)", [code]);
    expect(first.redeemed).toBe(true);
    const second = await userCall<Json>(db, staff, "public.coupon_redeem($1, null)", [code]);
    expect(second.redeemed).toBe(false);
    expect(second.status).toBe("redeemed");

    const rows = await db.query<{ redeemed_by: string }>("select redeemed_by from public.coupon_redemptions");
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].redeemed_by).toBe(staff);
    const audit = await db.query<{ n: number }>("select count(*)::int as n from public.audit_log where action = 'coupon.redeemed'");
    expect(audit.rows[0].n).toBe(1);
  });

  it("redeems only once when two staff phones submit at the same moment", async () => {
    const { staff, code } = await setup();
    const other = await createUser(db, "staff2@stall.test");
    await grantRole(db, other, "staff");
    const results = await Promise.all([
      userCall<Json>(db, staff, "public.coupon_redeem($1, null)", [code]),
      userCall<Json>(db, other, "public.coupon_redeem($1, null)", [code]),
    ]);
    expect(results.filter((r) => r.redeemed === true)).toHaveLength(1);
  });

  it("reports expired, invalid and void coupons", async () => {
    const { staff, code } = await setup();
    expect((await userCall<Json>(db, staff, "public.coupon_lookup($1)", ["TU-00000-00000"])).status).toBe("invalid");
    expect((await userCall<Json>(db, staff, "public.coupon_lookup($1)", ["nonsense"])).status).toBe("invalid");

    await db.query("update public.coupons set expires_at = now() - interval '1 minute' where code = $1", [code]);
    expect((await userCall<Json>(db, staff, "public.coupon_lookup($1)", [code])).status).toBe("expired");
    const r = await userCall<Json>(db, staff, "public.coupon_redeem($1, null)", [code]);
    expect(r.redeemed).toBe(false);
    expect(r.status).toBe("expired");

    await db.query("update public.coupons set status = 'void', expires_at = null where code = $1", [code]);
    expect((await userCall<Json>(db, staff, "public.coupon_lookup($1)", [code])).status).toBe("void");
  });

  it("supports multi-use coupons when configured", async () => {
    await setRewards({ maxRedemptions: 2 });
    const { staff, code } = await setup();
    expect((await userCall<Json>(db, staff, "public.coupon_redeem($1, null)", [code])).redemptionsLeft).toBe(1);
    expect((await userCall<Json>(db, staff, "public.coupon_redeem($1, null)", [code])).redemptionsLeft).toBe(0);
    expect((await userCall<Json>(db, staff, "public.coupon_redeem($1, null)", [code])).redeemed).toBe(false);
  });

  it("refuses students and anonymous callers", async () => {
    const { student, code } = await setup();
    await expect(userCall(db, student, "public.coupon_redeem($1, null)", [code])).rejects.toThrow(/forbidden/);
    await expect(userCall(db, student, "public.coupon_lookup($1)", [code])).rejects.toThrow(/forbidden/);
    await expect(
      as(db, "anon", null, (tx) => tx.query("select public.coupon_redeem($1, null)", [code])),
    ).rejects.toThrow(/permission denied/);
  });
});
