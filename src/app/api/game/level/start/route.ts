import { fail, isSameOriginJson, json, readJson } from "@/lib/api";
import { randomSeed } from "@/lib/game/rng";
import { gameContext, startLevelBody, withinRateLimit } from "@/lib/game/server";

export const dynamic = "force-dynamic";

/** Begin a level. The seed is chosen here, on the server, and recorded with the start time. */
export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return fail("bad_request", 400);
  const ctx = await gameContext();
  if (!ctx.ok) return fail(ctx.code, ctx.status);

  let body;
  try {
    body = startLevelBody.parse(await readJson(request, 2_000));
  } catch {
    return fail("bad_request", 400);
  }

  if (!(await withinRateLimit(ctx.service, `level:${ctx.user.id}`, 30, 60))) return fail("rate_limited", 429);

  const { data, error } = await ctx.service.rpc("game_start_level", {
    p_user: ctx.user.id,
    p_attempt: body.attemptId,
    p_level: body.level,
    p_seed: randomSeed(),
  });
  if (error || !data) return fail("server_error", 500);
  if (data.error) return fail(data.error, 409, { currentLevel: data.currentLevel });

  return json({ attemptId: data.attemptId, level: data.level, seed: Number(data.seed), startedAt: data.startedAt });
}
