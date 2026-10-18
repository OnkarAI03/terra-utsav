import { fail, isSameOriginJson, json } from "@/lib/api";
import { gameContext, parseSnapshot, withinRateLimit } from "@/lib/game/server";

export const dynamic = "force-dynamic";

/** Reasons the player may not start an attempt now (as opposed to a conflict worth retrying). */
const REFUSED = new Set(["no_attempts_left", "already_won", "rewards_closed", "not_open_yet", "event_over", "alias_account"]);

/** Start a reward attempt, or resume the player's unfinished one. */
export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return fail("bad_request", 400);
  const ctx = await gameContext();
  if (!ctx.ok) return fail(ctx.code, ctx.status);

  if (!(await withinRateLimit(ctx.service, `attempt:${ctx.user.id}`, 20, 60))) return fail("rate_limited", 429);

  const { data, error } = await ctx.service.rpc("game_start_attempt", { p_user: ctx.user.id });
  if (error || !data) return fail("server_error", 500);
  if (data.error) {
    const status = REFUSED.has(data.error) ? 403 : 409;
    return fail(data.error, status, { attemptsUsed: data.attemptsUsed, attemptsAllowed: data.attemptsAllowed });
  }

  const settings = parseSnapshot(data.settings);
  if (!settings) return fail("server_error", 500);

  return json({
    attemptId: data.attemptId,
    attemptNumber: data.attemptNumber,
    currentLevel: data.currentLevel,
    attemptsUsed: data.attemptsUsed,
    attemptsAllowed: data.attemptsAllowed,
    resumed: data.resumed === true,
    settings,
  });
}
