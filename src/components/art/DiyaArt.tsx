import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * A lit clay diya, drawn in code. The flame flickers (CSS, transform/opacity only) and holds
 * still under reduced motion. `decorated` adds painted dots like a festive hand-painted diya.
 */
export function DiyaArt({
  className,
  title,
  delay = 0,
  decorated = true,
  hue = "terracotta",
}: {
  className?: string;
  title?: string;
  delay?: number;
  decorated?: boolean;
  hue?: "terracotta" | "maroon" | "gold";
}) {
  const id = useId().replace(/:/g, "");
  const body = {
    terracotta: ["#d0683a", "#8a3417"],
    maroon: ["#b5304a", "#5e1220"],
    gold: ["#e8b04f", "#9a6416"],
  }[hue];
  return (
    <svg viewBox="0 0 140 120" className={cn("overflow-visible", className)} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <radialGradient id={`halo-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd77a" stopOpacity="0.75" />
          <stop offset="0.45" stopColor="#ff9f1c" stopOpacity="0.25" />
          <stop offset="1" stopColor="#ff9f1c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`clay-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={body[0]} />
          <stop offset="1" stopColor={body[1]} />
        </linearGradient>
        <linearGradient id={`flame-${id}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff7a00" />
          <stop offset="0.55" stopColor="#ffb703" />
          <stop offset="1" stopColor="#fff3b0" />
        </linearGradient>
      </defs>

      <circle cx="104" cy="44" r="40" fill={`url(#halo-${id})`} className="glow-pulse" style={{ animationDelay: `${delay}ms` }} />

      {/* Bowl with a pinched spout on the right */}
      <path d="M10 66 C14 98 52 112 78 108 C104 104 124 86 128 64 L118 60 C96 66 60 68 18 62 Z" fill={`url(#clay-${id})`} />
      <path d="M10 66 C40 72 90 72 118 60 L132 54 C126 62 122 64 118 66 C92 76 40 78 10 66Z" fill={body[1]} opacity="0.55" />
      <ellipse cx="66" cy="64" rx="56" ry="9" fill="#5b240d" />
      <ellipse cx="66" cy="63" rx="50" ry="6.5" fill="#c99a3a" opacity="0.85" />
      <path d="M118 60 L134 52 L124 64 Z" fill={body[0]} />

      {decorated && (
        <g fill="#fbefdb">
          {[26, 40, 54, 68, 82, 96, 110].map((x, i) => (
            <circle key={x} cx={x} cy={84 + Math.sin((i / 6) * Math.PI) * 10} r="2.6" />
          ))}
          <path d="M32 92 Q66 106 104 90" stroke="#ffc93c" strokeWidth="2.5" fill="none" />
        </g>
      )}

      {/* Wick and flame */}
      <path d="M118 56 L114 50" stroke="#2b140d" strokeWidth="3" strokeLinecap="round" />
      <g className="flicker" style={{ animationDelay: `${delay}ms` }}>
        <path d="M113 50 C100 40 106 24 113 10 C120 24 126 40 113 50Z" fill={`url(#flame-${id})`} />
        <path d="M113 47 C108 41 110 33 113 26 C116 33 118 41 113 47Z" fill="#fffbe6" />
      </g>
    </svg>
  );
}

/** A row of diyas for section edges and closings. */
export function DiyaRow({ count = 5, className }: { count?: number; className?: string }) {
  const hues = ["terracotta", "maroon", "gold"] as const;
  return (
    <div aria-hidden className={cn("flex items-end justify-center gap-[2%]", className)}>
      {Array.from({ length: count }, (_, i) => (
        <DiyaArt
          key={i}
          hue={hues[i % 3]}
          delay={i * 230}
          className={cn("shrink-0", i % 2 === 0 ? "w-[13%] max-w-[90px]" : "w-[11%] max-w-[76px] -translate-y-1")}
        />
      ))}
    </div>
  );
}
