"use client";

import { CircleCheck, CircleX, Clock, ShieldCheck, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { lookupCoupon, recentRedemptions, redeemCoupon, type CouponCheck } from "@/app/staff/actions";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { QrScanner } from "./QrScanner";

const STATUS = {
  valid: { label: "Valid", tone: "bg-success text-ink", icon: CircleCheck, help: "Good to redeem." },
  redeemed: { label: "Already redeemed", tone: "bg-danger text-ink", icon: CircleX, help: "This coupon has been used." },
  expired: { label: "Expired", tone: "bg-gold-300 text-ink", icon: Clock, help: "This coupon is past its expiry." },
  void: { label: "Cancelled", tone: "bg-danger text-ink", icon: CircleX, help: "An admin cancelled this coupon." },
  invalid: { label: "Not a valid code", tone: "bg-danger text-ink", icon: CircleX, help: "No coupon has this code. Check the letters and numbers." },
  rate_limited: { label: "Slow down", tone: "bg-gold-300 text-ink", icon: TriangleAlert, help: "Too many checks in a minute. Wait a moment." },
  error: { label: "Could not check", tone: "bg-gold-300 text-ink", icon: TriangleAlert, help: "" },
} as const;

export function RedeemConsole() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<CouponCheck | null>(null);
  const [justRedeemed, setJustRedeemed] = useState<CouponCheck | null>(null);
  const [armed, setArmed] = useState(false);
  const [recent, setRecent] = useState<{ code: string; label: string; redeemedAt: string }[]>([]);
  const [pending, startTransition] = useTransition();
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadRecent = useCallback(() => {
    startTransition(async () => setRecent(await recentRedemptions()));
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const check = (value: string) => {
    setJustRedeemed(null);
    setArmed(false);
    startTransition(async () => setResult(await lookupCoupon(value)));
  };

  const onDetect = useCallback((value: string) => {
    setCode(value.toUpperCase());
    check(value);
  }, []);

  const redeem = () => {
    if (!result?.code) return;
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
      const r = await redeemCoupon(target);
      if (r.redeemed) {
        setJustRedeemed(r);
        setResult(null);
        setCode("");
        setRecent(await recentRedemptions());
      } else {
        setResult(r);
      }
    });
  };

  const info = result ? STATUS[result.status] ?? STATUS.error : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <div className="flex flex-col gap-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) check(code);
          }}
          className="rounded-[var(--radius-card)] bg-cream-100 p-6 text-ink"
        >
          <label htmlFor="coupon-code" className="text-[1.05rem] font-extrabold">
            Coupon code
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="coupon-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="TU-XXXXX-XXXXX"
              className="min-w-0 flex-1 rounded-2xl border-2 border-choc-900/20 bg-cream-50 px-4 py-3.5 font-display text-[1.4rem] tracking-[0.08em] outline-none focus:border-maroon-600"
            />
            <Button type="submit" size="lg" disabled={pending || !code.trim()}>
              Check
            </Button>
          </div>
          <div className="mt-4">
            <QrScanner onDetect={onDetect} />
          </div>
        </form>

        {justRedeemed && (
          <div role="status" className="rounded-[var(--radius-card)] bg-success p-6 text-ink">
            <p className="flex items-center gap-2 font-display text-[1.8rem]">
              <CircleCheck aria-hidden className="h-8 w-8" /> Redeemed
            </p>
            <p className="mt-2 text-[1.05rem] font-bold">
              {justRedeemed.code} · {justRedeemed.label}
              {justRedeemed.valueText ? ` · ${justRedeemed.valueText}` : ""}
            </p>
            <p className="mt-1 text-[0.98rem]">Recorded under your name at {formatDateTime(justRedeemed.redeemedAt ?? new Date().toISOString())}.</p>
          </div>
        )}

        {result && info && (
          <div role="status" className="overflow-hidden rounded-[var(--radius-card)] bg-cream-100 text-ink">
            <p className={cn("flex items-center gap-2 px-6 py-4 font-display text-[1.6rem]", info.tone)}>
              <info.icon aria-hidden className="h-7 w-7" />
              {info.label}
            </p>
            <div className="p-6">
              <p className="text-[1rem]">{result.message ?? info.help}</p>
              {result.code && (
                <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[1rem]">
                  <dt className="font-bold text-ink-soft">Code</dt>
                  <dd className="font-display tracking-[0.06em]">{result.code}</dd>
                  {result.label && (
                    <>
                      <dt className="font-bold text-ink-soft">Coupon</dt>
                      <dd className="font-extrabold">{result.label}</dd>
                    </>
                  )}
                  <dt className="font-bold text-ink-soft">Worth</dt>
                  <dd className="font-extrabold">{result.valueText ?? "As announced at the stall"}</dd>
                  {result.holder && (
                    <>
                      <dt className="font-bold text-ink-soft">Holder</dt>
                      <dd className="font-extrabold">{result.holder}</dd>
                    </>
                  )}
                  {result.expiresAt && (
                    <>
                      <dt className="font-bold text-ink-soft">Expires</dt>
                      <dd className="font-extrabold">{formatDateTime(result.expiresAt)}</dd>
                    </>
                  )}
                  {result.lastRedeemedAt && (
                    <>
                      <dt className="font-bold text-ink-soft">Last used</dt>
                      <dd className="font-extrabold">{formatDateTime(result.lastRedeemedAt)}</dd>
                    </>
                  )}
                </dl>
              )}
              {result.status === "valid" && (
                <Button size="lg" className="mt-6 w-full sm:w-auto" onClick={redeem} disabled={pending} icon={<ShieldCheck />}>
                  {armed ? "Tap again to confirm" : "Redeem now"}
                </Button>
              )}
            </div>
          </div>
        )}
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
