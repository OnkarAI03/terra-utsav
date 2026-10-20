import Image from "next/image";
import { cn } from "@/lib/cn";

type Mood = "cheer" | "win" | "oops";

/** A four-point sparkle, drawn in code so it stays sharp at any size. */
function Sparkle({ x, y, r, c, delay }: { x: number; y: number; r: number; c: string; delay: string }) {
  const q = r * 0.18;
  return (
    <g className="burst" style={{ animationDelay: delay }}>
      <path
        d={`M${x} ${y - r} Q${x + q} ${y - q} ${x + r} ${y} Q${x + q} ${y + q} ${x} ${y + r} Q${x - q} ${y + q} ${x - r} ${y} Q${x - q} ${y - q} ${x} ${y - r}Z`}
        fill={c}
      />
    </g>
  );
}

/** A gold trophy with a paw on it, drawn in code. */
function Trophy({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 150" className={className} aria-hidden>
      <defs>
        <linearGradient id="cup-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b67a26" />
          <stop offset="0.45" stopColor="#f7d58c" />
          <stop offset="1" stopColor="#d99a3c" />
        </linearGradient>
      </defs>
      <path d="M22 26 C2 26 2 66 34 70" fill="none" stroke="#d99a3c" strokeWidth="9" strokeLinecap="round" />
      <path d="M98 26 C118 26 118 66 86 70" fill="none" stroke="#d99a3c" strokeWidth="9" strokeLinecap="round" />
      <path d="M20 14 H100 C100 64 84 86 60 90 C36 86 20 64 20 14Z" fill="url(#cup-gold)" stroke="#5a321f" strokeWidth="4" strokeLinejoin="round" />
      <rect x="52" y="88" width="16" height="22" fill="#d99a3c" stroke="#5a321f" strokeWidth="4" />
      <rect x="32" y="108" width="56" height="16" rx="5" fill="url(#cup-gold)" stroke="#5a321f" strokeWidth="4" />
      <rect x="24" y="122" width="72" height="20" rx="6" fill="#5a321f" />
      <g fill="#7a1a2a">
        <ellipse cx="60" cy="52" rx="10" ry="8.5" />
        <circle cx="46" cy="38" r="4.6" />
        <circle cx="55" cy="32" r="4.6" />
        <circle cx="65" cy="32" r="4.6" />
        <circle cx="74" cy="38" r="4.6" />
      </g>
    </svg>
  );
}

const SPARKLES = [
  { x: 18, y: 40, r: 11, c: "#ffd77a", delay: "0s" },
  { x: 182, y: 30, r: 9, c: "#fbefdb", delay: "0.6s" },
  { x: 196, y: 120, r: 12, c: "#ffc93c", delay: "1.2s" },
  { x: 8, y: 150, r: 8, c: "#fbefdb", delay: "1.8s" },
  { x: 100, y: 6, r: 7, c: "#ffd77a", delay: "2.4s" },
];

/**
 * The result screens use the full-resolution Mini (the locked character render) and give
 * it a motion for the mood: a hop for a cleared level, a hop with a trophy for a win, a wobble
 * for a miss. Motion collapses under reduced motion.
 */
export function ResultKitten({ mood, className }: { mood: Mood; className?: string }) {
  return (
    <div className={cn("result-kitten relative mx-auto w-[200px]", `is-${mood}`, className)}>
      {mood !== "oops" && (
        <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute inset-x-0 top-0 w-full overflow-visible">
          {SPARKLES.map((s, i) => (
            <Sparkle key={i} {...s} />
          ))}
        </svg>
      )}
      <div className="kitten relative mx-auto w-[150px]">
        <Image src="/images/mascot/koochu-idle.webp" alt="" width={762} height={1000} sizes="150px" className="w-full" />
      </div>
      {mood === "win" && <Trophy className="trophy absolute -right-4 bottom-1 w-[74px] drop-shadow-[0_10px_12px_rgb(10_3_2/0.6)]" />}
    </div>
  );
}
