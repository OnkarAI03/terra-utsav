import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { gameSettingsSchema, type GameSettings } from "./config";
import { resolveLevel, type LevelResult, type Tap } from "./engine";

export const startLevelBody = z.object({
  attemptId: z.uuid(),
  level: z.number().int().min(1).max(5),
});

const tapTuple = z.tuple([
  z.number().finite().min(0).max(180_000),
  z.number().finite().min(-0.2).max(1.2),
  z.number().finite().min(-0.2).max(1.2),
]);

export const submitLevelBody = z.object({
  attemptId: z.uuid(),
  level: z.number().int().min(1).max(5),
  taps: z.array(tapTuple).max(600),
});

export type GameContext =
  | { ok: true; user: User; service: SupabaseClient }
  | { ok: false; code: "not_configured" | "unauthenticated"; status: number };

/** Verify the visitor with Supabase Auth, then hand back the service client for game writes. */
export async function gameContext(): Promise<GameContext> {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();
  if (!supabase || !service) return { ok: false, code: "not_configured", status: 503 };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "unauthenticated", status: 401 };
  return { ok: true, user, service };
}

export async function withinRateLimit(service: SupabaseClient, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await service.rpc("rate_limit_hit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
  if (error) return true; // fail open on the limiter itself; attempt limits are enforced separately
  return data === true;
}

export function parseSnapshot(snapshot: unknown): GameSettings | null {
  const parsed = gameSettingsSchema.safeParse(snapshot);
  return parsed.success ? parsed.data : null;
}

/** Replay the submitted taps. The client's own idea of the result is never consulted. */
export function judgeLevel(settings: GameSettings, level: number, seed: number, rawTaps: [number, number, number][]): LevelResult {
  const taps: Tap[] = rawTaps.map(([t, x, y]) => ({ t, x, y }));
  return resolveLevel(seed, settings.levels[level - 1], settings, taps);
}
