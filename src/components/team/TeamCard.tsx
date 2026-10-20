"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { Repeat } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { TeamMember } from "@/lib/types";
import { MascotFigure } from "./MascotFigure";
import { VARIANT_LABEL } from "./OutfitOverlay";
import { PhotoSide } from "./PhotoSide";

export const SWITCH_INTERVAL_MS = 4000;

/**
 * One person, two pictures: their real photograph and their Mini. The card cross-fades
 * between them every few seconds while it is on screen. Switching pauses while the card is
 * hovered, focused or touched, when the visitor pauses all cards, when the card leaves the
 * viewport, and is replaced by the switch button under reduced motion. Screen readers always get
 * the same thing: the photo (the kitten is decoration), so nothing changes under them.
 */
export function TeamCard({
  member,
  groupName,
  variant = "student",
  index = 0,
  intervalMs = SWITCH_INTERVAL_MS,
  allPaused = false,
}: {
  member: TeamMember;
  groupName?: string | null;
  variant?: "student" | "mentor";
  index?: number;
  intervalMs?: number;
  /** The visitor paused every card (WCAG 2.2.2). */
  allPaused?: boolean;
}) {
  const reduce = usePrefersReducedMotion();
  // Real photos come first. Until a photo exists, lead with the kitten rather than a silhouette.
  const [showMascot, setShowMascot] = useState(!member.photoUrl);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const auto = !reduce && inView && !paused && !allPaused;
  const hasPhoto = Boolean(member.photoUrl);

  useEffect(() => {
    if (!auto) return;
    // Offset cards slightly so a grid does not flip in unison.
    const offset = (index % 4) * 450;
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      setShowMascot((v) => !v);
      interval = setInterval(() => setShowMascot((v) => !v), intervalMs);
    }, intervalMs + offset);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [auto, index, intervalMs]);

  const sizes = variant === "mentor" ? "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw" : "(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";
  const fade = { duration: reduce ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <article
      ref={ref}
      aria-labelledby={`${member.slug}-name`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse") setPaused(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden transition-transform duration-300 ease-out hover:-translate-y-1",
        variant === "mentor"
          ? "rounded-[var(--radius-panel)] bg-burgundy-800 text-cream-100 shadow-[var(--shadow-lift)] ring-2 ring-gold-500/70"
          : "rounded-[var(--radius-card)] bg-cream-100 text-ink shadow-[var(--shadow-card)]",
      )}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden" data-showing={showMascot ? "mascot" : "photo"}>
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: showMascot ? 0 : 1, scale: showMascot ? 1.04 : 1 }}
          transition={fade}
          aria-hidden={!hasPhoto || undefined}
        >
          <PhotoSide name={member.name} photoUrl={member.photoUrl} sizes={sizes} />
        </motion.div>
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: showMascot ? 1 : 0, scale: showMascot ? 1 : 1.04 }}
          transition={fade}
          aria-hidden={hasPhoto || undefined}
        >
          <MascotFigure name={member.name} variant={member.mascotVariant} mascotUrl={member.mascotUrl} sizes={sizes} />
        </motion.div>

        <button
          type="button"
          onClick={() => setShowMascot((v) => !v)}
          aria-pressed={showMascot}
          aria-label={`Show ${member.name} as Mini`}
          className={cn(
            "absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-cream-100 text-ink shadow-[0_4px_0_var(--color-cream-300)] transition-[opacity,transform] duration-200 active:translate-y-[2px]",
            reduce ? "opacity-100" : "opacity-0 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100",
          )}
        >
          <Repeat aria-hidden className="h-5 w-5" />
        </button>

        {member.isPlaceholder && (
          <span className="absolute left-3 top-3 rounded-full bg-gold-400 px-2.5 py-1 text-[0.8125rem] font-extrabold text-ink">Preview slot</span>
        )}
      </div>

      <div className={cn("flex flex-1 flex-col gap-1.5", variant === "mentor" ? "p-6" : "p-4 md:p-5")}>
        <h4
          id={`${member.slug}-name`}
          className={cn("font-display leading-[1.02]", variant === "mentor" ? "text-[1.8rem] text-cream-100" : "text-[1.3rem] text-choc-900 md:text-[1.4rem]")}
        >
          {member.name}
        </h4>
        <p className={cn("font-bold leading-snug", variant === "mentor" ? "text-[1.02rem] text-gold-300" : "text-[0.95rem] text-maroon-600")}>
          {member.title}
        </p>
        {groupName && <p className={cn("text-[0.88rem] font-semibold", variant === "mentor" ? "text-cream-100/85" : "text-ink-soft")}>{groupName}</p>}
        {member.bio && (
          <p className={cn("mt-1 text-[0.98rem] leading-relaxed", variant === "mentor" ? "text-cream-100" : "text-ink")}>{member.bio}</p>
        )}
        {member.links.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {member.links.map((l) => (
              <li key={l.url}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "rounded-full px-3 py-1 text-[0.85rem] font-extrabold underline-offset-4 hover:underline",
                    variant === "mentor" ? "bg-burgundy-950 text-cream-100" : "bg-cream-200 text-ink",
                  )}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )}
        {!hasPhoto && <p className="sr-only">Shown as Mini ({VARIANT_LABEL[member.mascotVariant]}).</p>}
      </div>
    </article>
  );
}
