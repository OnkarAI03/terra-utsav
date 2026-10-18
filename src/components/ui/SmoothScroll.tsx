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
    let lenis: { destroy(): void } | null = null;
    let cancelled = false;
    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      // lerp 0.1: each frame closes a tenth of the gap, the long, even glide people call "butter".
      // autoRaf: Lenis runs its own frame loop and idles when the page is still.
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: true, autoRaf: true });
    });
    return () => {
      cancelled = true;
      lenis?.destroy();
    };
  }, [pathname]);

  return null;
}
