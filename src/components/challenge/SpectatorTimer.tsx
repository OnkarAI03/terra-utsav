"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

const RADIUS = 92;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A just-for-fun countdown for friends watching. It does not, and cannot, detect a brick; it records
 * nothing; the official time is kept by staff. The page says so right next to it.
 */
export function SpectatorTimer({ seconds = 60 }: { seconds?: number }) {
  const [remaining, setRemaining] = useState(seconds * 1000);
  const [running, setRunning] = useState(false);
  const endAt = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = Math.max(0, (endAt.current ?? 0) - performance.now());
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [running]);

  const start = () => {
    endAt.current = performance.now() + (remaining > 0 ? remaining : seconds * 1000);
    if (remaining <= 0) setRemaining(seconds * 1000);
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setRemaining(seconds * 1000);
  };

  const secs = Math.ceil(remaining / 1000);
  const progress = remaining / (seconds * 1000);
  const done = remaining <= 0;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative grid h-[220px] w-[220px] place-items-center">
        <svg viewBox="0 0 220 220" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="110" cy="110" r={RADIUS} fill="none" stroke="var(--color-burgundy-800)" strokeWidth="16" />
          <circle
            cx="110"
            cy="110"
            r={RADIUS}
            fill="none"
            stroke={done ? "var(--color-success)" : "var(--color-gold-400)"}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          />
        </svg>
        <p className="relative text-center" role="timer" aria-live="off">
          <span className="block font-display text-[4.4rem] leading-none text-cream-100 tabular-nums">{done ? "0" : secs}</span>
          <span className="text-[0.95rem] font-bold text-cream-100">{done ? "Time!" : "seconds"}</span>
        </p>
      </div>
      <p className="sr-only" aria-live="polite">
        {done ? "Sixty seconds are up." : running ? "" : `${secs} seconds on the timer.`}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {running ? (
          <Button onClick={pause} icon={<Pause />} variant="secondary">
            Pause
          </Button>
        ) : (
          <Button onClick={start} icon={<Play />}>
            {done ? "Again" : remaining < seconds * 1000 ? "Resume" : "Start"}
          </Button>
        )}
        <Button onClick={reset} icon={<RotateCcw />} variant="outline" disabled={!running && remaining === seconds * 1000}>
          Reset
        </Button>
      </div>
    </div>
  );
}
