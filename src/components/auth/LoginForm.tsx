"use client";

import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

/** Instagram, Facebook and other in-app browsers: Google refuses to sign in there. */
function inAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Instagram|FBAN|FBAV|FB_IAB|Snapchat|Line\/|MicroMessenger/i.test(navigator.userAgent);
}

/**
 * Staff and admin sign-in with an email and password. Players never sign in (the game gives each
 * phone a guest account), so the site sends no sign-in emails and needs no email service. An admin
 * creates staff accounts in the Supabase dashboard: Authentication > Users > Add user, with
 * "Auto Confirm User" ticked.
 */
export function LoginForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return <p className="rounded-2xl bg-gold-300 p-4 font-bold text-ink">Staff sign-in isn&apos;t switched on yet.</p>;
  }

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value || !password) {
      setError("Enter your staff email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: failed } = await supabase.auth.signInWithPassword({ email: value, password });
    setBusy(false);
    if (failed) {
      setError(failed.status === 429 ? "Too many tries. Wait a few minutes and try again." : "That email and password don't match a staff account.");
      return;
    }
    router.replace(next);
    router.refresh();
  };

  const google = async () => {
    setBusy(true);
    const { error: failed } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (failed) {
      setBusy(false);
      setError("Google sign-in is not available right now.");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={signIn} className="flex flex-col gap-4" noValidate>
        <label htmlFor="email" className="text-[1rem] font-extrabold text-ink">
          Staff email
        </label>
        <div className="relative">
          <Mail aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border-2 border-choc-900/20 bg-cream-50 py-3.5 pl-12 pr-4 text-ink outline-none transition-colors focus:border-maroon-600"
          />
        </div>
        <label htmlFor="password" className="text-[1rem] font-extrabold text-ink">
          Password
        </label>
        <div className="relative">
          <KeyRound aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border-2 border-choc-900/20 bg-cream-50 py-3.5 pl-12 pr-4 text-ink outline-none transition-colors focus:border-maroon-600"
          />
        </div>
        <Button type="submit" size="lg" disabled={busy} trailing={<ArrowRight />}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {googleEnabled && !inAppBrowser() && (
        <>
          <p className="text-center text-[0.9rem] font-bold text-ink-soft">or</p>
          <Button variant="secondary" size="md" onClick={() => void google()} disabled={busy}>
            Continue with Google
          </Button>
        </>
      )}

      <p role={error ? "alert" : "status"} className={error ? "font-bold text-danger-ink" : "sr-only"}>
        {error ?? ""}
      </p>
    </div>
  );
}
