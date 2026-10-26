"use client";

import { Hourglass, PartyPopper } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { eventPhase, minutesText, shortTime } from "@/lib/countdown";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The live state of the Mandi: a ticking countdown before it opens, "Open now" while it runs, and a
 * thank-you after. The page is cached, so the clock starts in the visitor's browser; until then the
 * space is kept so nothing jumps. "chip" sits in the hero's date card, "board" in the Find us card.
 */
export function LiveCountdown({
  startsAt,
  endsAt,
  variant = "chip",
  className,
}: {
  startsAt: string | null;
  endsAt: string | null;
  variant?: "chip" | "board";
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const p = now === null ? null : eventPhase(startsAt, endsAt, now);
  const until = endsAt ? shortTime(endsAt) : null;

  if (variant === "chip") {
    return (
      <span className={cn("inline-flex min-h-6 items-center gap-2", className)}>
        {p?.phase === "before" && (
          <>
            <Hourglass aria-hidden className="h-4 w-4 shrink-0 text-maroon-600" />
            <span role="timer">
              Opens in{" "}
              <span className="tabular-nums text-maroon-600">
                {p.days > 0 && `${p.days}d `}
                {pad(p.hours)}h {pad(p.minutes)}m {pad(p.seconds)}s
              </span>
            </span>
          </>
        )}
        {p?.phase === "open" && (
          <>
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-success motion-safe:animate-pulse" />
            <span>
              Open now{until && <span className="text-maroon-600">{` · until ${until}`}</span>}
            </span>
          </>
        )}
        {p?.phase === "over" && (
          <>
            <PartyPopper aria-hidden className="h-4 w-4 shrink-0 text-maroon-600" />
            <span>That&apos;s a wrap. Thank you for coming!</span>
          </>
        )}
      </span>
    );
  }

  return (
    <div className={cn("min-h-[104px] rounded-[22px] bg-choc-950/55 p-4 text-cream-100 ring-1 ring-gold-400/30 sm:p-5", className)}>
      {p?.phase === "before" && (
        <>
          <p className="text-[0.9rem] font-extrabold uppercase tracking-[0.12em] text-gold-300">The Mandi opens in</p>
          <div role="timer" className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
            {[
              [p.days, "Days"],
              [p.hours, "Hours"],
              [p.minutes, "Minutes"],
              [p.seconds, "Seconds"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl bg-burgundy-950 px-1 py-2.5 text-center">
                <span className="block font-display text-[1.9rem] leading-none tabular-nums text-gold-300 sm:text-[2.3rem]">{pad(Number(value))}</span>
                <span className="mt-1 block text-[0.75rem] font-extrabold uppercase tracking-[0.08em] text-cream-100/85">{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {p?.phase === "open" && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="flex items-center gap-3 font-display text-[2rem] leading-none text-gold-300">
            <span aria-hidden className="h-3.5 w-3.5 rounded-full bg-success motion-safe:animate-pulse" />
            Open now
          </p>
          <p className="text-[1.05rem] font-extrabold">
            {until ? `Until ${until}` : "Come say hi"} · {minutesText(p.leftMinutes)} left
          </p>
        </div>
      )}
      {p?.phase === "over" && (
        <p className="font-display text-[1.6rem] leading-tight text-gold-300">That&apos;s a wrap. Thank you for coming, and happy Diwali!</p>
      )}
    </div>
  );
}
