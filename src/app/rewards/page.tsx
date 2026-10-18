import type { Metadata } from "next";
import { ArrowRight, Info } from "lucide-react";
import { redirect } from "next/navigation";
import { CouponTicket, type TicketState } from "@/components/rewards/CouponTicket";
import { ButtonLink } from "@/components/ui/Button";
import { PageHero } from "@/components/ui/PageHero";
import { getSession } from "@/lib/auth";
import { getGameSettings, getRewardSettings } from "@/lib/data/public";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My coupons",
  description: "Your TERRA UTSAV reward coupons.",
  alternates: { canonical: "/rewards" },
  robots: { index: false, follow: false },
};

interface CouponRow {
  id: string;
  code: string;
  label: string;
  value_text: string | null;
  status: "issued" | "redeemed" | "void";
  issued_at: string;
  expires_at: string | null;
  last_redeemed_at: string | null;
  max_redemptions: number;
  redemption_count: number;
}

function ticketState(c: CouponRow): TicketState {
  if (c.status === "void") return "void";
  if (c.status === "redeemed" || c.redemption_count >= c.max_redemptions) return "redeemed";
  if (c.expires_at && new Date(c.expires_at).getTime() <= Date.now()) return "expired";
  return "valid";
}

export default async function RewardsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHero title="My coupons" intro="Coupons appear here once sign-in is switched on for the stall." />
        <section className="bg-cream-200 py-20 text-ink">
          <div className="shell">
            <p className="max-w-xl text-[1.05rem]">The stall team has not connected the rewards database yet. Practise the game in the meantime.</p>
          </div>
        </section>
      </>
    );
  }

  const session = await getSession();
  if (!session) redirect("/login?next=/rewards");

  const [rewards, game, couponsRes, attemptsRes, stateRes] = await Promise.all([
    getRewardSettings(),
    getGameSettings(),
    session.supabase
      .from("coupons")
      .select("id, code, label, value_text, status, issued_at, expires_at, last_redeemed_at, max_redemptions, redemption_count")
      .order("issued_at", { ascending: false }),
    session.supabase.from("game_attempts").select("id, status").neq("status", "void"),
    session.supabase.from("player_state").select("bonus_attempts").eq("user_id", session.user.id).maybeSingle(),
  ]);

  const coupons = (couponsRes.data ?? []) as CouponRow[];
  const used = attemptsRes.data?.length ?? 0;
  const allowed = game.maxRewardAttempts + (stateRes.data?.bonus_attempts ?? 0);

  return (
    <>
      <PageHero title="My coupons" intro={`Signed in as ${session.user.email}. Show a coupon at the TERRA UTSAV stall to use it.`} />
      <section className="bg-burgundy-950 pb-24 pt-12 md:pb-32">
        <div className="shell grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
          <div>
            {couponsRes.error ? (
              <p className="rounded-2xl bg-gold-300 p-5 font-bold text-ink">We could not load your coupons right now. Please refresh in a moment.</p>
            ) : coupons.length === 0 ? (
              <div className="rounded-[var(--radius-panel)] bg-cream-100 p-8 text-ink">
                <h2 className="display-m text-choc-900">No coupons yet</h2>
                <p className="mt-3 max-w-md text-[1.05rem] leading-relaxed">
                  Clear all five levels of Catch the Koochu Puchu in a reward attempt and your coupon lands here.
                </p>
                <ButtonLink href="/game" className="mt-6" trailing={<ArrowRight />}>
                  Play now
                </ButtonLink>
              </div>
            ) : (
              <ul className="flex flex-col gap-6">
                {coupons.map((c) => (
                  <li key={c.id}>
                    <CouponTicket
                      className="[--notch:#2a0b10]"
                      code={c.code}
                      label={c.label}
                      valueText={c.value_text}
                      expiresAt={c.expires_at}
                      issuedAt={c.issued_at}
                      state={ticketState(c)}
                      redemptionsLeft={Math.max(0, c.max_redemptions - c.redemption_count)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="flex flex-col gap-6">
            <div className="rounded-[var(--radius-card)] bg-burgundy-800 p-6 text-cream-100">
              <h2 className="title text-cream-100">Reward attempts</h2>
              <p className="mt-2 font-display text-[2.4rem] leading-none text-gold-300">
                {used} <span className="text-[1.2rem] text-cream-100">of {allowed} used</span>
              </p>
              {used < allowed && (
                <ButtonLink href="/game" variant="secondary" size="sm" className="mt-5">
                  Play
                </ButtonLink>
              )}
            </div>
            <div className="flex gap-3 rounded-[var(--radius-card)] bg-cream-100 p-6 text-ink">
              <Info aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-maroon-600" />
              <div className="text-[1rem] leading-relaxed">
                <p className="font-extrabold">How to use a coupon</p>
                <p className="mt-1">{rewards.redemptionInstructions}</p>
                <p className="mt-2">Keep your screen bright so the QR code scans easily.</p>
              </div>
            </div>
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-[0.95rem] font-extrabold text-cream-100 underline underline-offset-4 hover:text-gold-300">
                Sign out
              </button>
            </form>
          </aside>
        </div>
      </section>
    </>
  );
}
