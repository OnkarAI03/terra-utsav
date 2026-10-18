"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Rests the decorative loops (twinkling string lights, flickering diya flames, swaying kandils,
 * embers, the ribbon) in every section that is off screen, so scrolling only pays for what you
 * can see. Most of these loops run on SVG art, which repaints the whole drawing on every frame
 * while it animates. A section gets `data-paused` while it is out of view and the CSS pauses
 * everything inside it (globals.css). Entrances are unaffected: they use transitions.
 */
export function PauseOffscreen() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) delete el.dataset.paused;
          else el.dataset.paused = "";
        }
      },
      // Wake a section a little before it scrolls in, so its loops are already running.
      { rootMargin: "160px 0px" },
    );
    const sections = document.querySelectorAll<HTMLElement>("main section, footer");
    sections.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      sections.forEach((el) => delete el.dataset.paused);
    };
  }, [pathname]);

  return null;
}
