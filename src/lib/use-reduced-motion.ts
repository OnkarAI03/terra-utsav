"use client";

import { useEffect, useState } from "react";

/**
 * True when the visitor asks for reduced motion. Follows changes live. Used for behaviour
 * (auto-switching, game effects); Framer Motion's MotionConfig handles animation values.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduce;
}
