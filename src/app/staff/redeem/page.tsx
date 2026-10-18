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
      <PageHero title="Staff" intro="The staff console opens on event day, once sign-in is switched on." />
    );
  }
  const session = await requirePageRole("staff", "/staff/redeem");

  return (
    <>
      <section className="bg-burgundy-950 pb-24 pt-[calc(var(--header-h)+20px)] md:pb-32">
        <div className="shell mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h1 className="font-display text-[1.9rem] leading-none text-cream-100">Redeem coupons</h1>
          <p className="text-[0.95rem] font-bold text-cream-100/90">
            {session.user.email} · every redemption is recorded under your name ·{" "}
            <a href="#brick" className="underline underline-offset-4">
              Brick results
            </a>
          </p>
        </div>
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
