import { fail, isSameOriginJson, json, readJson } from "@/lib/api";
import { gameContext, judgeLevel, parseSnapshot, submitLevelBody, tapsRewound, withinRateLimit } from "@/lib/game/server";

export const dynamic = "force-dynamic";

/**
 * Finish a level. The body carries only the raw taps (time, x, y). The server replays them against
 * the level generated from the stored seed; the database then checks the order of play and the
 * clock, records the result and, after a win on the final level, issues at most one coupon.
 */
export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return fail("bad_request", 400);
  const ctx = await gameContext();
  if (!ctx.ok) return fail(ctx.code, ctx.status);

  let body;
  try {
    body = submitLevelBody.parse(await readJson(request, 40_000));
  } catch {
    return fail("bad_request", 400);
  }

  if (!(await withinRateLimit(ctx.service, `submit:${ctx.user.id}`, 30, 60))) return fail("rate_limited", 429);

  const { data: attempt, error: attemptError } = await ctx.service
    .from("game_attempts")
    .select("id, user_id, status, current_level, settings_snapshot")
    .eq("id", body.attemptId)
    .maybeSingle();
  if (attemptError) return fail("server_error", 500);
  if (!attempt || attempt.user_id !== ctx.user.id) return fail("attempt_not_found", 404);

  const { data: levelRow, error: levelError } = await ctx.service
    .from("game_attempt_levels")
    .select("seed, submitted_at")
    .eq("attempt_id", body.attemptId)
    .eq("level", body.level)
    .maybeSingle();
  if (levelError) return fail("server_error", 500);
  if (!levelRow) return fail("level_not_started", 409);

  const settings = parseSnapshot(attempt.settings_snapshot);
  if (!settings) return fail("server_error", 500);

  const result = judgeLevel(settings, body.level, Number(levelRow.seed), body.taps);

  const { data, error } = await ctx.service.rpc("game_submit_level", {
    p_user: ctx.user.id,
    p_attempt: body.attemptId,
    p_level: body.level,
    p_outcome: result.outcome,
    p_catches: result.catches,
    p_decoy_hits: result.decoyHits,
    p_taps: result.tapsCounted,
    p_game_time_ms: Math.round(result.endedAt),
    p_flags: { tooFast: result.tooFast, ignored: result.ignored, submittedTaps: body.taps.length, rewound: tapsRewound(body.taps) },
  });
  if (error || !data) return fail("server_error", 500);
  if (data.error) return fail(data.error, 409);

  return json({
    level: body.level,
    outcome: data.outcome,
    attemptStatus: data.attemptStatus,
    nextLevel: data.nextLevel ?? null,
    reward: data.reward ?? null,
    coupon: data.coupon ?? null,
    catches: result.catches,
    decoyHits: result.decoyHits,
  });
}
