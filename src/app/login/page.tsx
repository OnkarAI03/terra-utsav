import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { PageHero } from "@/components/ui/PageHero";
import { getSession, safeNextPath } from "@/lib/auth";
import { googleAuthEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staff sign in",
  description: "Sign-in for TERRA UTSAV staff and admins. Players don't need to sign in.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

const DENIED: Record<string, string> = {
  staff: "That account is not on the staff list. Ask a TERRA UTSAV admin to add you.",
  admin: "That account does not have admin access.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null, "/staff/redeem");
  const denied = typeof params.denied === "string" ? DENIED[params.denied] : null;
  const linkError = params.error === "link" || params.error === "browser";
  const session = await getSession();
  // A player's guest account (made by the game) is not a staff sign-in.
  const staffSession = session && !session.user.is_anonymous ? session : null;

  return (
    <>
      <PageHero title="Staff sign in" intro="For TERRA UTSAV staff and admins. Players don't need to sign in: just open the game and play." />
      <section className="bg-cream-200 pb-24 pt-12 text-ink md:pb-32">
        <div className="shell grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <div className="max-w-lg rounded-[var(--radius-panel)] bg-cream-100 p-7 shadow-[var(--shadow-card)] md:p-9">
            {denied && <p className="mb-5 rounded-2xl bg-gold-300 p-4 font-bold">{denied}</p>}
            {linkError && <p className="mb-5 rounded-2xl bg-gold-300 p-4 font-bold">That sign-in didn&apos;t go through. Please sign in again here.</p>}
            {staffSession ? (
              <div className="flex flex-col gap-4">
                <p className="text-[1.05rem]">
                  You are signed in as <strong>{staffSession.user.email}</strong>.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href={next} className="rounded-full bg-maroon-600 px-5 py-3 font-display uppercase text-cream-100">
                    Continue
                  </Link>
                  <form action="/auth/signout" method="post">
                    <button type="submit" className="rounded-full border-2 border-choc-900/30 px-5 py-3 font-display uppercase text-ink">
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <>
                {session && (
                  <p className="mb-5 rounded-2xl bg-cream-200 p-4 text-[0.95rem] font-bold">
                    This phone has a player&apos;s guest coupon wallet. Signing in as staff here hides those coupons from My coupons on this phone.
                  </p>
                )}
                <LoginForm next={next} googleEnabled={googleAuthEnabled()} />
              </>
            )}
          </div>
          <div className="relative mx-auto hidden w-[300px] lg:block">
            <Image src="/images/mascot/koochu-idle.webp" alt="" width={762} height={1000} sizes="300px" className="w-full" />
          </div>
        </div>
      </section>
    </>
  );
}
