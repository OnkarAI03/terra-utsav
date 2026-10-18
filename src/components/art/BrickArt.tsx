import { cn } from "@/lib/cn";

/**
 * One wet clay brick, drawn in code (no photo of the real challenge brick exists yet).
 * Drops fall from its edges; they stop under reduced motion.
 */
export function BrickArt({ className, title = "A single wet clay brick" }: { className?: string; title?: string }) {
  const specks = [
    [70, 150, 2.2], [92, 168, 1.6], [118, 152, 2], [60, 128, 1.4], [104, 136, 1.8],
    [168, 160, 2], [196, 140, 1.5], [228, 132, 2.2], [250, 118, 1.6], [214, 162, 1.4],
    [150, 70, 1.6], [176, 84, 1.3], [208, 66, 1.8], [120, 96, 1.4], [240, 92, 1.2],
  ] as const;
  return (
    <svg viewBox="0 0 320 260" className={cn("overflow-visible", className)} role={title ? "img" : undefined} aria-label={title || undefined} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id="brick-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b5512f" />
          <stop offset="1" stopColor="#7d3119" />
        </linearGradient>
        <linearGradient id="brick-side" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#99412a" />
          <stop offset="1" stopColor="#5f2413" />
        </linearGradient>
        <linearGradient id="brick-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dc7a52" />
          <stop offset="1" stopColor="#b85a37" />
        </linearGradient>
        <radialGradient id="brick-puddle" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f7d58c" stopOpacity="0.28" />
          <stop offset="1" stopColor="#f7d58c" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="168" cy="236" rx="150" ry="16" fill="url(#brick-puddle)" />

      {/* Faces */}
      <polygon points="30,96 186,44 296,86 140,138" fill="url(#brick-top)" />
      <polygon points="30,96 140,138 140,214 30,172" fill="url(#brick-front)" />
      <polygon points="140,138 296,86 296,162 140,214" fill="url(#brick-side)" />

      {/* Frog (the hollow on top) */}
      <polygon points="96,92 182,64 236,84 150,112" fill="#9c4528" opacity="0.85" />
      <polygon points="104,94 182,68 226,85 150,108" fill="#8a3a21" opacity="0.6" />

      {/* Clay specks */}
      {specks.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#3d1409" opacity="0.35" />
      ))}

      {/* Wet sheen */}
      <path d="M44 112 L128 146" stroke="#fff4e0" strokeOpacity="0.35" strokeWidth="5" strokeLinecap="round" />
      <path d="M48 134 L96 152" stroke="#fff4e0" strokeOpacity="0.2" strokeWidth="3" strokeLinecap="round" />
      <path d="M160 134 L280 94" stroke="#fff4e0" strokeOpacity="0.28" strokeWidth="4" strokeLinecap="round" />
      <path d="M70 92 L176 56" stroke="#fff4e0" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 150 Q60 168 92 166 Q118 182 140 186 L140 214 L30 172 Z" fill="#2b0d06" opacity="0.28" />
      <path d="M140 186 Q190 176 220 160 Q262 150 296 134 L296 162 L140 214 Z" fill="#2b0d06" opacity="0.32" />

      {/* Hanging drops */}
      <g fill="#cfe6f2" fillOpacity="0.85">
        <path d="M66 182 q-6 10 0 14 q6 -4 0 -14z" />
        <path d="M188 202 q-6 10 0 14 q6 -4 0 -14z" />
        <path d="M262 176 q-5 9 0 12 q5 -3 0 -12z" />
      </g>

      {/* Falling drops */}
      <g fill="#cfe6f2" fillOpacity="0.8">
        <path className="drip" d="M66 200 q-4 7 0 10 q4 -3 0 -10z" />
        <path className="drip" style={{ animationDelay: "0.6s" }} d="M188 218 q-4 7 0 10 q4 -3 0 -10z" />
        <path className="drip" style={{ animationDelay: "1.1s" }} d="M262 192 q-4 7 0 10 q4 -3 0 -10z" />
      </g>
    </svg>
  );
}
