"use client";

import { CircleCheck, CircleX, Clock, ShieldCheck, TriangleAlert, WifiOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { lookupCoupon, recentRedemptions, redeemCoupon, type CouponCheck } from "@/app/staff/actions";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { QrScanner } from "./QrScanner";

/** Every refusal is one deep-red STOP block; only "try again" states are amber. Words and icons always carry the meaning. */
const STATUS = {
  valid: { label: "Valid: OK to redeem", tone: "bg-success text-ink", icon: CircleCheck, help: "One coupon per person: check they haven't had one already, then press Redeem now twice." },
  redeemed: { label: "STOP: already used", tone: "bg-danger-ink text-cream-50", icon: CircleX, help: "This coupon has been used. Sorry, it can't be used again." },
  expired: { label: "STOP: expired", tone: "bg-danger-ink text-cream-50", icon: Clock, help: "This coupon is past its expiry." },
  void: { label: "STOP: cancelled", tone: "bg-danger-ink text-cream-50", icon: CircleX, help: "An admin cancelled this coupon." },
  invalid: { label: "STOP: not a coupon", tone: "bg-danger-ink text-cream-50", icon: CircleX, help: "No coupon has this code. Check the letters and numbers." },
  rate_limited: { label: "Slow down", tone: "bg-gold-300 text-ink", icon: TriangleAlert, help: "Too many checks in a minute. Wait a moment, then try again." },
  offline: { label: "No connection", tone: "bg-gold-300 text-ink", icon: WifiOff, help: "Nothing was changed. Check the Wi-Fi and try again." },
  error: { label: "Could not check", tone: "bg-gold-300 text-ink", icon: TriangleAlert, help: "Try again in a moment." },
} as const;

type Shown = CouponCheck | { status: "offline"; code?: string; message?: string };

/** Server actions over flaky campus Wi-Fi: give up after 8 s instead of hanging. */
function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

const secondsAgo = (iso?: string | null) => (iso ? Math.round((Date.now() - Date.parse(iso)) / 1000) : Infinity);

/** "TU-ABCDE-FGHJK", "abcde fghjk", "tuabcdefghjk": what matters is the 10 characters after TU. */
function codeLength(raw: string) {
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/^TU/, "").length;
}

export function RedeemConsole() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Shown | null>(null);
  const [justRedeemed, setJustRedeemed] = useState<CouponCheck | null>(null);
  const [armed, setArmed] = useState(false);
  const [recent, setRecent] = useState<{ code: string; label: string; redeemedAt: string }[]>([]);
  const [pending, startTransition] = useTransition();
  const [, startRecent] = useTransition();
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const loadRecent = useCallback(() => {
    startRecent(async () => {
      try {
        setRecent(await withTimeout(recentRedemptions()));
      } catch {
        /* the list is a convenience; keep the old one */
      }
    });
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  // Bring the answer into view (and drop the phone keyboard) as soon as it arrives.
  useEffect(() => {
    if (!result && !justRedeemed) return;
    input.current?.blur();
    resultRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [result, justRedeemed]);

  const check = (value: string) => {
    setJustRedeemed(null);
    setArmed(false);
    if (codeLength(value) !== 10) {
      setResult({ status: "invalid", message: `That has ${codeLength(value)} characters after TU. A code has exactly 10 (the letter O counts as zero).` });
      return;
    }
    startTransition(async () => {
      try {
        setResult(await withTimeout(lookupCoupon(value)));
      } catch {
        setResult({ status: "offline", code: value });
      }
    });
  };

  const onDetect = useCallback((value: string) => {
    setCode(value.toUpperCase());
    check(value);
  }, []);

  const redeem = () => {
    if (result?.status !== "valid" || !result.code) return;
    if (!armed) {
      // Two taps to redeem, so a stray tap never uses someone's coupon.
      setArmed(true);
      if (armTimer.current) clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => setArmed(false), 4000);
      return;
    }
    setArmed(false);
    const target = result.code;
    startTransition(async () => {
      try {
        const r = await withTimeout(redeemCoupon(target));
        if (r.redeemed) {
          setJustRedeemed(r);
          setResult(null);
          setCode("");
          loadRecent();
        } else {
          setResult(r);
        }
      } catch {
        // The redeem may have gone through before the connection dropped: look before saying anything.
        try {
          const now = await withTimeout(lookupCoupon(target));
          if (now.status === "redeemed" && secondsAgo(now.lastRedeemedAt) < 90) {
            setJustRedeemed(now);
            setResult(null);
            setCode("");
            loadRecent();
          } else {
            setResult(now);
          }
        } catch {
          setResult({ status: "offline", code: target, message: "We couldn't confirm the redeem. Nothing was changed if this keeps showing; press Check again before handing anything over." });
        }
      }
    });
  };

  const info = result ? (STATUS[result.status as keyof typeof STATUS] ?? STATUS.error) : null;
  const valid = result?.status === "valid";
  const full = result && result.status !== "offline" ? (result as CouponCheck) : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <div className="flex flex-col gap-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) check(code);
          }}
          className="rounded-[var(--radius-card)] bg-cream-100 p-5 text-ink sm:p-6"
        >
          <div className="mb-4">
            <QrScanner onDetect={onDetect} />
          </div>
          <label htmlFor="coupon-code" className="text-[1.05rem] font-extrabold">
            Or type the coupon code
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <input
                id="coupon-code"
                ref={input}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  // A new code: the old answer no longer applies.
                  if (result) setResult(null);
                  setArmed(false);
                }}
                onFocus={(e) => e.currentTarget.select()}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                enterKeyHint="go"
                maxLength={20}
                placeholder="TU-XXXXX-XXXXX"
                aria-describedby="coupon-code-help"
                className="w-full rounded-2xl border-2 border-choc-900/40 bg-cream-50 py-3.5 pl-4 pr-12 font-display text-[1.4rem] tracking-[0.08em] outline-none focus:border-maroon-600"
              />
              {code && (
                <button
                  type="button"
                  onClick={() => {
                    setCode("");
                    setResult(null);
                    input.current?.focus();
                  }}
                  aria-label="Clear the code"
                  className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-ink-soft hover:bg-cream-200"
                >
                  <X aria-hidden className="h-5 w-5" />
                </button>
              )}
            </div>
            <Button type="submit" size="lg" disabled={pending || !code.trim()}>
              {pending ? "Checking…" : "Check"}
            </Button>
          </div>
          <p id="coupon-code-help" className="mt-2 text-[0.9rem] font-semibold text-ink-soft">
            10 letters and numbers after TU. Dashes and spaces don&apos;t matter.
          </p>
        </form>

        <div ref={resultRef} className="scroll-mt-28">
          {justRedeemed && (
            <div role="status" className="rounded-[var(--radius-card)] bg-success p-6 text-ink">
              <p className="flex items-center gap-2 font-display text-[1.8rem]">
                <CircleCheck aria-hidden className="h-8 w-8" /> Done: hand over the reward
              </p>
              <p className="mt-2 text-[1.15rem] font-extrabold">{justRedeemed.valueText ?? "Reward as announced at the stall"}</p>
              <p className="mt-1 text-[1rem] font-bold">
                {justRedeemed.code} · {justRedeemed.label}
              </p>
              <p className="mt-1 text-[0.98rem]">Recorded at {formatDateTime(justRedeemed.redeemedAt ?? justRedeemed.lastRedeemedAt ?? new Date().toISOString())}.</p>
            </div>
          )}

          {result && info && (
            <div role="status" className="overflow-hidden rounded-[var(--radius-card)] bg-cream-100 text-ink">
              <p className={cn("flex items-center gap-2 px-6 py-4 font-display text-[1.8rem] leading-tight", info.tone)}>
                <info.icon aria-hidden className="h-8 w-8 shrink-0" />
                {info.label}
              </p>
              <div className="p-6">
                <p className="text-[1.05rem] font-semibold">{result.message ?? info.help}</p>
                {full?.code && (
                  <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[1rem]">
                    <dt className="font-bold text-ink-soft">Code</dt>
                    <dd className="font-display tracking-[0.06em]">{full.code}</dd>
                    {valid && (
                      <>
                        <dt className="font-bold text-ink-soft">Worth</dt>
                        <dd className="font-extrabold">{full.valueText ?? "As announced at the stall"}</dd>
                      </>
                    )}
                    {full.holder && (
                      <>
                        <dt className="font-bold text-ink-soft">Holder</dt>
                        <dd className="font-extrabold">{full.holder}</dd>
                      </>
                    )}
                    {valid && full.expiresAt && (
                      <>
                        <dt className="font-bold text-ink-soft">Expires</dt>
                        <dd className="font-extrabold">{formatDateTime(full.expiresAt)}</dd>
                      </>
                    )}
                    {full.lastRedeemedAt && (
                      <>
                        <dt className="font-bold text-ink-soft">Used</dt>
                        <dd className="font-extrabold">
                          {formatDateTime(full.lastRedeemedAt)}
                          {secondsAgo(full.lastRedeemedAt) < 600 ? ` (${Math.max(1, Math.round(secondsAgo(full.lastRedeemedAt) / 60))} min ago)` : ""}
                        </dd>
                      </>
                    )}
                  </dl>
                )}
                {valid && (
                  <Button
                    size="lg"
                    className={cn("mt-6 w-full sm:w-auto", armed && "!bg-gold-500 !text-ink")}
                    onClick={redeem}
                    disabled={pending}
                    icon={<ShieldCheck />}
                  >
                    {pending ? "Redeeming…" : armed ? "Tap again to confirm" : "Redeem now"}
                  </Button>
                )}
                {(result.status === "offline" || result.status === "error") && (
                  <Button size="lg" variant="dark" className="mt-6 w-full sm:w-auto" onClick={() => check(result.code ?? code)} disabled={pending}>
                    Try again
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="rounded-[var(--radius-card)] bg-burgundy-800 p-6 text-cream-100">
        <h2 className="title text-cream-100">Your recent redemptions</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-[0.98rem]">Nothing redeemed by you yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {recent.map((r) => (
              <li key={`${r.code}-${r.redeemedAt}`} className="rounded-2xl bg-burgundy-950 px-4 py-3">
                <p className="font-display tracking-[0.05em]">{r.code}</p>
                <p className="text-[0.9rem] text-cream-100/90">{formatDateTime(r.redeemedAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
