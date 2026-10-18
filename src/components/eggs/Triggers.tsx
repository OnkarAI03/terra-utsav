"use client";

import { useRef, useState } from "react";
import { DiyaArt } from "@/components/art/DiyaArt";
import { PawIcon } from "@/components/brand/PawIcon";
import { cn } from "@/lib/cn";
import { findEgg } from "./store";

/** Hero diyas: tap one and its flame flares. Get all five flaring at once for a mystery egg. */
export function HeroDiyas({ className }: { className?: string }) {
  const hues = ["terracotta", "maroon", "gold", "maroon", "terracotta"] as const;
  const [lit, setLit] = useState<boolean[]>(() => hues.map(() => false));

  const toggle = (i: number) => {
    const next = lit.map((v, j) => (j === i ? !v : v));
    setLit(next);
    if (next.every(Boolean)) setTimeout(() => findEgg("diyas", "petals"), 250);
  };

  return (
    <div role="group" aria-label="Diyas" className={cn("flex items-end gap-[3%]", className)}>
      {hues.map((hue, i) => (
        <button
          key={i}
          type="button"
          onClick={() => toggle(i)}
          aria-label={`Diya ${i + 1}`}
          aria-pressed={lit[i]}
          className={cn("diya-btn w-[17%] max-w-[64px] rounded-full", lit[i] && "is-lit")}
        >
          <DiyaArt hue={hue} delay={i * 230} className="w-full" />
        </button>
      ))}
    </div>
  );
}

/** The "Can you catch me?" note. Take the dare and the kitten dashes across the screen. */
export function CatchMeNote({ children, className, rotate = -8 }: { children: React.ReactNode; className?: string; rotate?: number }) {
  return (
    <button
      type="button"
      onClick={() => findEgg("dash", "dash")}
      className={cn(
        "paper-note hand inline-block cursor-pointer px-5 py-4 text-left uppercase shadow-[0_14px_24px_-14px_rgb(10_3_2/0.9)] transition-transform duration-200 ease-out hover:scale-[1.04] active:scale-95",
        className,
      )}
      style={{ rotate: `${rotate}deg` }}
      aria-label="Can you catch me? Take the dare"
    >
      {children}
    </button>
  );
}

/** Counts quick taps on the header wordmark. Five in a row and the kitten peeks out. */
export function useLogoTaps() {
  const taps = useRef<number[]>([]);
  return () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 2500), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      findEgg("paw", "peek");
    }
  };
}

/** The footer wordmark, letter by letter: tap it and the letters jump. */
export function TicklishWordmark() {
  const [jump, setJump] = useState(0);
  const letters = Array.from("TERRA UTSAV");
  return (
    <button
      type="button"
      onClick={() => {
        setJump((j) => j + 1);
        findEgg("wordmark", "petals");
      }}
      className="ticklish flex w-full cursor-pointer select-none items-center justify-center gap-[0.18em] rounded-2xl font-display text-[clamp(2.9rem,11.4vw,10.5rem)] leading-none"
      data-jump={jump === 0 ? undefined : jump % 2 ? "a" : "b"}
      aria-label="TERRA UTSAV. Tickle the letters"
    >
      <span className="text-sticker whitespace-nowrap" aria-hidden>
        {letters.map((ch, i) => (
          <span key={i} className="tl inline-block" style={{ ["--i" as string]: i }}>
            {ch === " " ? "\u00a0" : ch}
          </span>
        ))}
      </span>
      <PawIcon className="h-[0.62em] w-[0.62em] shrink-0 text-gold-300 drop-shadow-[0_0.06em_0_var(--color-choc-900)]" />
    </button>
  );
}
