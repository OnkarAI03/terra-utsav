import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { PageHero } from "@/components/ui/PageHero";
import { getSession, safeNextPath } from "@/lib/auth";
import { googleAuthEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to TERRA UTSAV to play for rewards and keep your coupons.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

const DENIED: Record<string, string> = {
  staff: "That account is not on the staff list. Ask a TERRA UTSAV admin to add you.",
  admin: "That account does not have admin access.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null, "/rewards");
  const denied = typeof params.denied === "string" ? DENIED[params.denied] : null;
  const linkError = params.error === "link";
  const browserError = params.error === "browser";
  const session = await getSession();

  return (
    <>
      <PageHero title="Sign in" intro="Sign in with your email to play for rewards and keep your coupons in one place." />
      <section className="bg-cream-200 pb-24 pt-12 text-ink md:pb-32">
        <div className="shell grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <div className="max-w-lg rounded-[var(--radius-panel)] bg-cream-100 p-7 shadow-[var(--shadow-card)] md:p-9">
            {denied && <p className="mb-5 rounded-2xl bg-gold-300 p-4 font-bold">{denied}</p>}
            {linkError && <p className="mb-5 rounded-2xl bg-gold-300 p-4 font-bold">That sign-in link has expired or was already used. Type the 6-digit code from the email instead, or ask for a new one.</p>}
            {browserError && (
              <p className="mb-5 rounded-2xl bg-gold-300 p-4 font-bold">
                The link opened in a different browser from the one you started in. Go back to that one (Instagram, for example) and type the 6-digit code from the email.
              </p>
            )}
            {session ? (
              <div className="flex flex-col gap-4">
                <p className="text-[1.05rem]">
                  You are signed in as <strong>{session.user.email}</strong>.
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
              <LoginForm next={next} googleEnabled={googleAuthEnabled()} />
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
