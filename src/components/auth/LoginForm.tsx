"use client";

import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Passwordless sign-in. Supabase emails a magic link and (if the email template includes
 * {{ .Token }}) a 6-digit code; either works. We only ever store the email address.
 */
export function LoginForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return (
      <p className="rounded-2xl bg-gold-300 p-4 font-bold text-ink">
        Sign-in is not switched on yet. The stall team needs to connect Supabase (see the README). You can still practise the game.
      </p>
    );
  }

  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL.test(value)) {
      setMessage({ tone: "error", text: "Please enter a valid email address." });
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({ email: value, options: { emailRedirectTo: redirectTo(), shouldCreateUser: true } });
    setBusy(false);
    if (error) {
      setMessage({
        tone: "error",
        text: error.status === 429 ? "Too many sign-in emails. Wait a minute and try again." : "We could not send the email. Check the address and try again.",
      });
      return;
    }
    setEmail(value);
    setStep("code");
    setMessage({ tone: "info", text: `We sent a sign-in email to ${value}. Tap the link in it, or type the 6-digit code here.` });
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) {
      setMessage({ tone: "error", text: "The code has 6 digits." });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    setBusy(false);
    if (error) {
      setMessage({ tone: "error", text: "That code did not work. It may have expired; ask for a new email." });
      return;
    }
    router.replace(next);
    router.refresh();
  };

  const google = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
    if (error) {
      setBusy(false);
      setMessage({ tone: "error", text: "Google sign-in is not available right now." });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {step === "email" ? (
        <form onSubmit={sendLink} className="flex flex-col gap-4" noValidate>
          <label htmlFor="email" className="text-[1rem] font-extrabold text-ink">
            Your email
          </label>
          <div className="relative">
            <Mail aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border-2 border-choc-900/20 bg-cream-50 py-3.5 pl-12 pr-4 text-ink outline-none transition-colors focus:border-maroon-600"
              placeholder="you@college.edu"
              aria-describedby="email-help"
            />
          </div>
          <p id="email-help" className="text-[0.92rem] text-ink-soft">
            No password needed. We only use your email to sign you in and keep your coupons safe.
          </p>
          <Button type="submit" size="lg" disabled={busy} trailing={<ArrowRight />}>
            {busy ? "Sending…" : "Email me a sign-in link"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-4" noValidate>
          <label htmlFor="code" className="text-[1rem] font-extrabold text-ink">
            6-digit code
          </label>
          <div className="relative">
            <KeyRound aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-2xl border-2 border-choc-900/20 bg-cream-50 py-3.5 pl-12 pr-4 font-display text-[1.4rem] tracking-[0.3em] text-ink outline-none focus:border-maroon-600"
              placeholder="123456"
            />
          </div>
          <Button type="submit" size="lg" disabled={busy} trailing={<ArrowRight />}>
            {busy ? "Checking…" : "Sign in"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setMessage(null);
            }}
            className="text-[0.95rem] font-extrabold text-maroon-600 underline underline-offset-4"
          >
            Use a different email
          </button>
        </form>
      )}

      {googleEnabled && step === "email" && (
        <>
          <p className="text-center text-[0.9rem] font-bold text-ink-soft">or</p>
          <Button variant="secondary" size="md" onClick={() => void google()} disabled={busy}>
            Continue with Google
          </Button>
        </>
      )}

      <p role={message?.tone === "error" ? "alert" : "status"} className={message ? (message.tone === "error" ? "font-bold text-danger-ink" : "font-bold text-ink") : "sr-only"}>
        {message?.text ?? ""}
      </p>
    </div>
  );
}
