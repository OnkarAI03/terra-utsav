"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Leans its content towards the pointer in 3D, like a card picked up off the counter. Mouse and
 * trackpad only; nothing moves under reduced motion. The transform is written straight to the
 * element (no CSS variables), and the loop stops as soon as the card has settled.
 * Children marked `data-depth="near"` or `"mid"` float towards the viewer while it leans.
 */
export function Tilt({ children, className, max = 7 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let rx = 0;
    let ry = 0;
    let tx = 0;
    let ty = 0;
    let raf = 0;
    let last = 0;
    let running = false;

    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const k = 1 - Math.exp(-14 * dt);
      rx += (tx - rx) * k;
      ry += (ty - ry) * k;
      el.style.transform = `perspective(1000px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)`;
      if (Math.abs(tx - rx) + Math.abs(ty - ry) > 0.02) {
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
        last = 0;
        if (tx === 0 && ty === 0) el.style.transform = "";
      }
    };
    const kick = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };
    const move = (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      const px = (e.clientX - box.left) / box.width - 0.5;
      const py = (e.clientY - box.top) / box.height - 0.5;
      ty = px * max * 2;
      tx = -py * max * 2;
      kick();
    };
    const leave = () => {
      tx = 0;
      ty = 0;
      kick();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      el.style.transform = "";
    };
  }, [max]);

  return (
    <div ref={ref} className={cn("tilt [transform-style:preserve-3d]", className)}>
      {children}
    </div>
  );
}
