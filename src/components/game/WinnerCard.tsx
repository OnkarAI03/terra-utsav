"use client";

import { useEffect, useState } from "react";
import { PawIcon } from "@/components/brand/PawIcon";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { LocalWin } from "@/lib/game/prize";

const clock = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });

/**
 * The winner's card for prize play without the database. It is meant to be shown live on the
 * phone that won: the clock ticks every second and the dot pulses, so a screenshot or a forwarded
 * photo shows a frozen time. The team member gives the prize and taps "Prize given".
 */
export function WinnerCard({ win, prize, onGiven, className }: { win: LocalWin; prize: string | null; onGiven: () => void; className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const given = win.claimedAt !== null;
  const give = () => {
    if (window.confirm("Team member: hand over the prize now? This marks it as collected on this device.")) onGiven();
  };

  return (
    <article
      className={cn("overflow-hidden rounded-[22px] text-ink shadow-[var(--shadow-card)]", given ? "bg-cream-300" : "bg-cream-100", className)}
      aria-label={`Catch Mini winner card, code ${win.code.split("").join(" ")}, ${given ? "prize collected" : "prize not collected yet"}`}
    >
      <div className="flex items-center justify-between gap-3 bg-maroon-600 px-5 py-3 text-cream-100">
        <span className="flex items-center gap-2 font-display text-[1.2rem] leading-none">
          <PawIcon className="h-5 w-5 text-gold-300" />
          Catch Mini winner
        </span>
        <span className="flex items-center gap-2 text-[0.95rem] font-extrabold">
          <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full", given ? "bg-cream-300" : "bg-success motion-safe:animate-pulse")} />
          {given ? "Collected" : "Live"}
        </span>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
        <div className="min-w-0">
          <p className="text-[0.875rem] font-extrabold text-maroon-600">Winner code</p>
          <p className="font-display text-[2.2rem] leading-none tracking-[0.06em] text-choc-900">{win.code}</p>
          {prize && <p className="mt-2 font-display text-[1.25rem] leading-tight text-choc-900">{prize}</p>}
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[0.95rem]">
            <div className="flex gap-1">
              <dt className="font-bold text-ink-soft">Won:</dt>
              <dd className="font-extrabold">{formatDateTime(win.wonAt)}</dd>
            </div>
            {given && (
              <div className="flex gap-1">
                <dt className="font-bold text-ink-soft">Collected:</dt>
                <dd className="font-extrabold">{formatDateTime(win.claimedAt)}</dd>
              </div>
            )}
          </dl>
        </div>
        {!given && (
          <div className="rounded-2xl bg-choc-900 px-5 py-3 text-center text-cream-100">
            <p className="text-[0.8rem] font-extrabold uppercase tracking-[0.12em] text-gold-300">Live time</p>
            {/* Visual proof only; screen readers get the static details above. */}
            <p aria-hidden className="font-display text-[1.7rem] leading-tight tabular-nums">
              {now ? clock.format(now) : "…"}
            </p>
          </div>
        )}
      </div>

      <div className="border-t-2 border-dashed border-choc-900/25 px-5 py-4 sm:px-6">
        {given ? (
          <p className="font-extrabold text-success-ink">Prize collected. Enjoy, and happy Diwali!</p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[0.95rem] font-bold text-ink-soft">For our team: check the time is ticking, hand over the prize, then tap.</p>
            <Button variant="dark" className="shrink-0" onClick={give}>
              Prize given
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}
