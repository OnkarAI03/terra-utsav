import { json } from "@/lib/api";
import { getGameSettings } from "@/lib/data/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** What the game screen needs to know about the visitor. Uses their own RLS-limited view. */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return json({ configured: false, signedIn: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ configured: true, signedIn: false });

  const settings = await getGameSettings();
  const [attempts, state, coupons] = await Promise.all([
    supabase.from("game_attempts").select("id, status, current_level").neq("status", "void"),
    supabase.from("player_state").select("bonus_attempts").eq("user_id", user.id).maybeSingle(),
    supabase.from("coupons").select("id", { count: "exact", head: true }),
  ]);

  const rows = attempts.data ?? [];
  const active = rows.find((a) => a.status === "in_progress");
  return json({
    configured: true,
    signedIn: true,
    attemptsUsed: rows.length,
    attemptsAllowed: settings.maxRewardAttempts + (state.data?.bonus_attempts ?? 0),
    activeAttempt: active ? { id: active.id, currentLevel: active.current_level } : null,
    coupons: coupons.count ?? 0,
  });
}
