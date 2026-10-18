import { cn } from "@/lib/cn";

/**
 * Diwali dressing for the top of dark sections: a marigold toran with mango leaves, a string of
 * warm lights, and star-shaped akash kandils swaying on their strings. Decorative.
 */
export function FestivalLights({
  className,
  kandils = true,
  lights = true,
  kandilAt,
}: {
  className?: string;
  kandils?: boolean;
  lights?: boolean;
  /** x positions (0-1440) for the kandils; keep them clear of headlines. */
  kandilAt?: number[];
}) {
  // Marigold toran along a gentle curve.
  const flowers = Array.from({ length: 46 }, (_, i) => {
    const t = i / 45;
    const x = t * 1440;
    const y = 10 + Math.sin(t * Math.PI) * 34;
    return { x, y, c: i % 3 === 0 ? "#ffc93c" : "#f28c28" };
  });
  const leaves = Array.from({ length: 15 }, (_, i) => {
    const t = (i + 0.5) / 15;
    return { x: t * 1440, y: 16 + Math.sin(t * Math.PI) * 34 };
  });
  const bulbs = Array.from({ length: 18 }, (_, i) => {
    const t = i / 17;
    return { x: 20 + t * 1400, y: 52 + Math.sin(t * Math.PI) * 58, d: (i % 5) * 0.55 };
  });
  const lens = [70, 104, 96, 66, 88, 78];
  const lanterns = (kandilAt ?? [150, 520, 930, 1290]).map((x, i) => ({
    x,
    len: lens[i % lens.length],
    c: i % 2 ? "#f28c28" : "#931f33",
    d: `${-((i * 0.9) % 3)}s`,
  }));

  return (
    <svg aria-hidden viewBox="0 0 1440 240" preserveAspectRatio="xMidYMin slice" className={cn("pointer-events-none", className)}>
      {/* String lights */}
      {lights && (
        <>
          <path d="M0 40 Q720 170 1440 40" stroke="#1a0c08" strokeWidth="2" fill="none" opacity="0.8" />
          {bulbs.map((b, i) => (
            <g key={i}>
              <circle cx={b.x} cy={b.y + 6} r="17" fill="#ffd77a" opacity="0.18" className="twinkle" style={{ animationDelay: `${b.d}s` }} />
              <circle cx={b.x} cy={b.y + 6} r="5" fill="#ffe7b0" />
            </g>
          ))}
        </>
      )}

      {/* Kandils */}
      {kandils &&
        lanterns.map((l, i) => (
          <g key={i} className="sway" style={{ animationDelay: l.d }}>
            <line x1={l.x} y1={0} x2={l.x} y2={l.len} stroke="#1a0c08" strokeWidth="2" />
            <g transform={`translate(${l.x} ${l.len + 30})`}>
              <circle r="44" fill="#ffb347" opacity="0.18" className="glow-pulse" />
              <polygon
                points="0,-34 9,-11 33,-10 14,5 21,29 0,15 -21,29 -14,5 -33,-10 -9,-11"
                fill={l.c}
                stroke="#3a1f14"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <polygon points="0,-20 5,-7 19,-6 8,3 12,17 0,9 -12,17 -8,3 -19,-6 -5,-7" fill="#ffd77a" opacity="0.9" />
              <path d="M-6 30 L-8 58 M0 30 L0 64 M6 30 L8 58" stroke="#ffc93c" strokeWidth="3" strokeLinecap="round" />
            </g>
          </g>
        ))}

      {/* Marigold toran with mango leaves */}
      <path d="M0 10 Q720 78 1440 10" stroke="#3a1f14" strokeWidth="3" fill="none" />
      {leaves.map((l, i) => (
        <path
          key={i}
          d={`M${l.x} ${l.y} q-9 14 0 30 q9 -16 0 -30z`}
          fill={i % 2 ? "#3f7d3a" : "#4f9446"}
          stroke="#1f3d1c"
          strokeWidth="1.5"
        />
      ))}
      {flowers.map((f, i) => (
        <g key={i}>
          <circle cx={f.x} cy={f.y} r="13" fill={f.c} />
          <circle cx={f.x} cy={f.y} r="13" fill="none" stroke="#c4561a" strokeWidth="2" strokeDasharray="3 3" />
          <circle cx={f.x} cy={f.y} r="4.5" fill="#c4561a" />
        </g>
      ))}
    </svg>
  );
}
