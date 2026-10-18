"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Pages where the native scroll stays untouched: play, staff tools, admin and sign-in. */
const NATIVE = ["/game", "/admin", "/staff", "/login", "/auth"];

/**
 * Smooth wheel scrolling for the public pages, on mouse and trackpad only. Touch keeps the
 * phone's own scrolling, and reduced motion keeps the browser's. Same-page links (#find-us,
 * #diyas) glide to their section and stop below the fixed header.
 */
export function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (NATIVE.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Loaded only for mouse and trackpad visitors; phones never download it.
    let lenis: { raf(t: number): void; destroy(): void } | null = null;
    let raf = 0;
    let cancelled = false;
    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({ lerp: 0.12, smoothWheel: true, anchors: true });
      raf = requestAnimationFrame(function loop(time) {
        lenis?.raf(time);
        raf = requestAnimationFrame(loop);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, [pathname]);

  return null;
}
