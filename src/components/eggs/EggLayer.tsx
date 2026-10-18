"use client";

import { Egg } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { EGGS, type Effect, type EggId } from "./store";

interface Toast {
  key: number;
  name: string;
  count: number;
  total: number;
}

const PETAL_COLOURS = ["#ffc93c", "#f28c28", "#e0457b", "#fbefdb"];

/** Draws every mystery-egg effect: toast, marigold petal shower, peeking kitten, dashing kitten. */
export function EggLayer() {
  const reduce = usePrefersReducedMotion();
  const [toast, setToast] = useState<Toast | null>(null);
  const [petals, setPetals] = useState<number | null>(null);
  const [peek, setPeek] = useState<number | null>(null);
  const [dash, setDash] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
    const onEffect = (e: Event) => {
      const effect = (e as CustomEvent<Effect>).detail;
      const key = Date.now();
      if (effect === "petals" && !reduce) {
        setPetals(key);
        later(() => setPetals((k) => (k === key ? null : k)), 4200);
      }
      if (effect === "peek" || (effect === "dash" && reduce)) {
        setPeek(key);
        later(() => setPeek((k) => (k === key ? null : k)), 2800);
      }
      if (effect === "dash" && !reduce) {
        setDash(key);
        later(() => setDash((k) => (k === key ? null : k)), 2000);
      }
    };
    const onEgg = (e: Event) => {
      const { id, count, total } = (e as CustomEvent<{ id: EggId; count: number; total: number }>).detail;
      const key = Date.now();
      setToast({ key, name: EGGS.find((x) => x.id === id)?.name ?? "Mystery egg", count, total });
      later(() => setToast((t) => (t?.key === key ? null : t)), 4500);
    };
    window.addEventListener("tu:effect", onEffect);
    window.addEventListener("tu:egg", onEgg);
    const pending = timers.current;
    return () => {
      window.removeEventListener("tu:effect", onEffect);
      window.removeEventListener("tu:egg", onEgg);
      pending.forEach(clearTimeout);
    };
  }, [reduce]);

  return (
    <>
      {petals !== null && (
        <div key={petals} aria-hidden className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
          {Array.from({ length: 42 }, (_, i) => {
            const left = (i * 37) % 100;
            const delay = (i % 7) * 0.18 + (i % 3) * 0.07;
            const size = 10 + (i % 4) * 4;
            return (
              <span
                key={i}
                className="petal absolute -top-6 block rounded-[60%_40%_60%_40%]"
                style={{
                  left: `${left}%`,
                  width: size,
                  height: size * 0.7,
                  background: PETAL_COLOURS[i % PETAL_COLOURS.length],
                  animationDelay: `${delay}s`,
                  animationDuration: `${2.6 + (i % 5) * 0.3}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {peek !== null && (
        <div key={peek} aria-hidden className="egg-peek pointer-events-none fixed bottom-0 right-4 z-[80] w-[150px] md:right-10 md:w-[190px]">
          <p className="paper-note hand absolute -top-14 right-2 px-3 py-2 text-[1rem] uppercase" style={{ rotate: "-6deg" }}>
            Meow! You found me.
          </p>
          <Image src="/images/game/koochu-peek.webp" alt="" width={520} height={474} className="w-full" />
        </div>
      )}

      {dash !== null && (
        <div key={dash} aria-hidden className="egg-dash pointer-events-none fixed bottom-6 left-0 z-[80] w-[150px] md:w-[190px]">
          <Image src="/images/game/run-1.webp" alt="" width={214} height={197} className="egg-run-a absolute inset-0 w-full" />
          <Image src="/images/game/run-2.webp" alt="" width={221} height={199} className="egg-run-b w-full" />
        </div>
      )}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[85] flex justify-center px-4">
        {toast && (
          <div
            key={toast.key}
            className="egg-toast flex items-center gap-3 rounded-[18px] bg-cream-100 px-4 py-3 text-ink shadow-[var(--shadow-lift)] ring-2 ring-gold-400"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-maroon-600 text-gold-300">
              <Egg aria-hidden className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-display text-[1.1rem] text-choc-900">Mystery egg found: {toast.name}</span>
              <span className="text-[0.92rem] font-bold text-ink-soft">
                {toast.count} of {toast.total} found · <span lang="mr">शुभ दीपावली!</span>
              </span>
            </span>
          </div>
        )}
      </div>
    </>
  );
}
