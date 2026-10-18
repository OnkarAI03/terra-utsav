import { cn } from "@/lib/cn";

/**
 * Gentle twinkling stars for the night sky. It's an eco-friendly Diwali, so no fireworks: just
 * light. Each star fades and grows a little, then rests. Decorative.
 */
export function TwinkleStars({ className }: { className?: string }) {
  const stars = [
    { x: 700, y: 120, r: 16, c: "#ffd77a", d: "0s" },
    { x: 1180, y: 70, r: 12, c: "#fbefdb", d: "1.4s" },
    { x: 980, y: 230, r: 10, c: "#ffc93c", d: "2.6s" },
    { x: 610, y: 290, r: 9, c: "#fbefdb", d: "3.3s" },
    { x: 1330, y: 260, r: 14, c: "#ffd77a", d: "0.8s" },
    { x: 860, y: 40, r: 8, c: "#ffc93c", d: "2s" },
  ];
  return (
    <svg aria-hidden viewBox="0 0 1440 400" preserveAspectRatio="xMidYMin slice" className={cn("pointer-events-none", className)}>
      {stars.map((s, i) => (
        <g key={i} className="burst" style={{ animationDelay: s.d }}>
          <circle cx={s.x} cy={s.y} r={s.r * 1.6} fill={s.c} opacity="0.18" />
          <path
            d={`M${s.x} ${s.y - s.r} Q${s.x + s.r * 0.18} ${s.y - s.r * 0.18} ${s.x + s.r} ${s.y} Q${s.x + s.r * 0.18} ${s.y + s.r * 0.18} ${s.x} ${s.y + s.r} Q${s.x - s.r * 0.18} ${s.y + s.r * 0.18} ${s.x - s.r} ${s.y} Q${s.x - s.r * 0.18} ${s.y - s.r * 0.18} ${s.x} ${s.y - s.r}Z`}
            fill={s.c}
          />
        </g>
      ))}
    </svg>
  );
}
