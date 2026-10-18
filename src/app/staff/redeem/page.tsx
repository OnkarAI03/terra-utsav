import type { Metadata } from "next";
import { ChallengeRecorder } from "@/components/staff/ChallengeRecorder";
import { RedeemConsole } from "@/components/staff/RedeemConsole";
import { PageHero } from "@/components/ui/PageHero";
import { requirePageRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staff: redeem coupons",
  robots: { index: false, follow: false },
};

export default async function StaffRedeemPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageHero title="Staff" intro="Coupon redemption works once Supabase is connected. See the README for setup." />
    );
  }
  const session = await requirePageRole("staff", "/staff/redeem");

  return (
    <>
      <PageHero title="Redeem coupons" intro={`Staff console. Signed in as ${session.user.email}. Every redemption is recorded under your name.`} />
      <section className="bg-burgundy-950 pb-24 pt-10 md:pb-32">
        <div className="shell flex flex-col gap-10">
          <RedeemConsole />
          <div className="max-w-2xl">
            <ChallengeRecorder />
          </div>
        </div>
      </section>
    </>
  );
}
