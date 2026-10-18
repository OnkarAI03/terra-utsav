"use client";

import Image from "next/image";

/**
 * Koochu Puchu and the chocolate bomb. On large screens the art bleeds in from the left edge of
 * the window (so wide screens are never empty on the left) and drifts slightly slower than the
 * page as you scroll (`.hero-drift`, a scroll-driven CSS animation: no scroll handler). On phones it
 * sits on top of the headline. The edges blend with linear fades into the festival backdrop; the
 * entrance is a CSS keyframe so it never waits for script.
 */
export function HeroArt({ children }: { children?: React.ReactNode }) {
  return (
    <div className="hero-art relative h-[min(44svh,400px)] w-full lg:absolute lg:inset-y-0 lg:left-0 lg:h-auto lg:w-[48vw] lg:max-w-[920px]">
      <div className="hero-drift absolute inset-0">
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
