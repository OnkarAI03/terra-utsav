"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** Transparent over the hero, solid once the page scrolls. */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // A 12px marker at the very top of the page: once it has scrolled out of view, the page has
    // scrolled. The browser reports that by itself, so scrolling runs no code here.
    const marker = document.createElement("div");
    marker.setAttribute("aria-hidden", "true");
    marker.style.cssText = "position:absolute;top:0;left:0;width:1px;height:12px;pointer-events:none";
    document.body.prepend(marker);
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    io.observe(marker);
    return () => {
      io.disconnect();
      marker.remove();
    };
  }, []);

  return (
    <header
      className={cn(
        "pt-safe fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300",
        // Over the hero photo a dark scrim keeps the links readable (cream on it stays above 9:1).
        scrolled ? "bg-burgundy-950 shadow-[0_10px_30px_-18px_rgb(0_0_0/0.9)]" : "bg-gradient-to-b from-night/85 via-night/55 to-transparent",
      )}
    >
      {children}
    </header>
  );
}
