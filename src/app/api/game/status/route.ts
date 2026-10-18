import { json } from "@/lib/api";
import { getEventSettings, getGameSettings, getRewardSettings } from "@/lib/data/public";
import { rewardPhase } from "@/lib/game/window";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** What the game screen needs to know about the visitor. Uses their own RLS-limited view. */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return json({ configured: false, signedIn: false });

  const [event, rewards] = await Promise.all([getEventSettings(), getRewardSettings()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ configured: true, signedIn: false, rewardPhase: rewardPhase(event, rewards) });

  const settings = await getGameSettings();
  const [attempts, state, coupons, roles] = await Promise.all([
    supabase.from("game_attempts").select("id, status, current_level").neq("status", "void"),
    supabase.from("player_state").select("bonus_attempts").eq("user_id", user.id).maybeSingle(),
    supabase.from("coupons").select("id", { count: "exact", head: true }),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  // Staff and admins can test reward play before the event (the database allows the same).
  const earlyAccess = (roles.data ?? []).some((r) => r.role === "staff" || r.role === "admin");
  const rows = attempts.data ?? [];
  const active = rows.find((a) => a.status === "in_progress");
  return json({
    configured: true,
    signedIn: true,
    rewardPhase: rewardPhase(event, rewards, { earlyAccess }),
    attemptsUsed: rows.length,
    attemptsAllowed: settings.maxRewardAttempts + (state.data?.bonus_attempts ?? 0),
    activeAttempt: active ? { id: active.id, currentLevel: active.current_level } : null,
    coupons: coupons.count ?? 0,
  });
}
