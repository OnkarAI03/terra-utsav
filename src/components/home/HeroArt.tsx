"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Koochu Puchu and the chocolate bomb. On large screens the art bleeds in from the left edge of
 * the window (so wide screens are never empty on the left) and drifts slightly slower than the
 * page as you scroll. On phones it sits on top of the headline. The edges blend with linear fades
 * into the festival backdrop; the entrance is a CSS keyframe so it never waits for script.
 */
export function HeroArt({ children }: { children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce || !window.matchMedia("(min-width: 1024px)").matches) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 900);
        el.style.transform = `translate3d(0, ${y * 0.12}px, 0)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduce]);

  return (
    <div className="hero-art relative h-[min(44svh,400px)] w-full lg:absolute lg:inset-y-0 lg:left-0 lg:h-auto lg:w-[48vw] lg:max-w-[920px]">
      <div ref={ref} className="absolute inset-0 will-change-transform">
        {/* On large screens the frame is 14% wider than the panel and starts off the left edge:
            the tail and fluff are cropped so the face sits clear of the headline's fade. */}
        <div className="anim-art-in absolute inset-0 lg:-left-[14%]">
          <Image
            src="/images/scenes/koochu-chocolate-bomb.webp"
            alt="Koochu Puchu, our calico kitten mascot, winking with a chocolate-covered paw over a cracked chocolate bomb"
            fill
            priority
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-cover object-[50%_28%] lg:object-[60%_center]"
          />
        </div>
      </div>
      {children}
    </div>
  );
}
