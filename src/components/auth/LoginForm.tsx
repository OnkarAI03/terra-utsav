"use client";

import { ArrowRight, KeyRound, Mail, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Passwordless sign-in. Supabase emails a 6-digit code (and a link). The code is the main path:
 * it works in any browser, including Instagram's built-in one, where an emailed link opens in a
 * different browser and cannot finish the sign-in. The step survives a reload. We only ever
 * store the email address.
 */
const STEP_KEY = "tu-login-step";

/** Instagram, Facebook and other in-app browsers: Google refuses to sign in there. */
function inAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Instagram|FBAN|FBAV|FB_IAB|Snapchat|Line\/|MicroMessenger/i.test(navigator.userAgent);
}
export function LoginForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [inApp, setInApp] = useState(false);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    setInApp(inAppBrowser());
    // Back from the email app (or a reload): pick up at the code step.
    try {
      const saved = JSON.parse(sessionStorage.getItem(STEP_KEY) ?? "null") as { email: string; at: number } | null;
      if (saved && Date.now() - saved.at < 30 * 60_000) {
        setEmail(saved.email);
        setStep("code");
        setMessage({ tone: "info", text: `Type the 6-digit code we sent to ${saved.email}.` });
      }
    } catch {
      /* private mode */
    }
    // Coming back from a page that started a redirect: never leave the button stuck on "Sending…".
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  if (!supabase) {
    return (
      <p className="rounded-2xl bg-gold-300 p-4 font-bold text-ink">
        Signing in opens closer to the Mandi. You can practise the game already, no sign-in needed.
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
        text: error.status === 429 ? "Too many sign-in emails just now. Wait a few minutes and try again." : "We could not send the email. Check the address and try again.",
      });
      return;
    }
    setEmail(value);
    setStep("code");
    try {
      sessionStorage.setItem(STEP_KEY, JSON.stringify({ email: value, at: Date.now() }));
    } catch {
      /* private mode */
    }
    setMessage({
      tone: "info",
      text: inApp
        ? `We sent a 6-digit code to ${value}. Type it here: inside Instagram, don't tap the link in the email.`
        : `We sent a 6-digit code to ${value}. Type it here (or tap the link in the email on this phone).`,
    });
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
    try {
      sessionStorage.removeItem(STEP_KEY);
    } catch {
      /* private mode */
    }
    router.replace(next);
    router.refresh();
  };

  const resend = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo(), shouldCreateUser: true } });
    setBusy(false);
    setMessage(error ? { tone: "error", text: "Could not send another email. Wait a few minutes and try again." } : { tone: "info", text: `A new code is on its way to ${email}.` });
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
            No password needed. We email you a 6-digit code. We only use your email to sign you in and keep your coupon safe.
          </p>
          <Button type="submit" size="lg" disabled={busy} trailing={<ArrowRight />}>
            {busy ? "Sending…" : "Email me a code"}
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
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <button type="button" onClick={() => void resend()} disabled={busy} className="min-h-11 text-[0.95rem] font-extrabold text-maroon-600 underline underline-offset-4">
              Send a new code
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setMessage(null);
                try {
                  sessionStorage.removeItem(STEP_KEY);
                } catch {
                  /* private mode */
                }
              }}
              className="min-h-11 text-[0.95rem] font-extrabold text-maroon-600 underline underline-offset-4"
            >
              Use a different email
            </button>
          </div>
        </form>
      )}

      {googleEnabled && step === "email" && !inApp && (
        <>
          <p className="text-center text-[0.9rem] font-bold text-ink-soft">or</p>
          <Button variant="secondary" size="md" onClick={() => void google()} disabled={busy}>
            Continue with Google
          </Button>
        </>
      )}
      {inApp && step === "email" && (
        <p className="flex items-start gap-2 rounded-2xl bg-cream-200 p-3 text-[0.95rem] font-bold text-ink">
          <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          Opened from Instagram? Use the email code here{googleEnabled ? ": Google sign-in doesn't work in Instagram's browser" : ""}. Or tap ••• and open this page in your browser.
        </p>
      )}

      <p role={message?.tone === "error" ? "alert" : "status"} className={message ? (message.tone === "error" ? "font-bold text-danger-ink" : "font-bold text-ink") : "sr-only"}>
        {message?.text ?? ""}
      </p>
    </div>
  );
}
