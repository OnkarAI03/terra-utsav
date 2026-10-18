"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** Transparent over the hero, solid once the page scrolls. */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "pt-safe fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300",
        scrolled ? "bg-burgundy-950 shadow-[0_10px_30px_-18px_rgb(0_0_0/0.9)]" : "bg-transparent",
      )}
    >
      {children}
    </header>
  );
}
