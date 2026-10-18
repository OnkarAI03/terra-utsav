import { cn } from "@/lib/cn";

/** Small marigold used as the separator in the ribbon (drawn, not a glyph). */
function Marigold() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={i} cx="12" cy="6" rx="3.2" ry="5" fill={i % 2 ? "#ffc93c" : "#f28c28"} transform={`rotate(${i * 45} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="3.4" fill="#c4561a" />
    </svg>
  );
}

/**
 * A festive ribbon that scrolls slowly across the page (linear, it is constant motion). It pauses
 * under the pointer and stands still under reduced motion. Each run repeats the items twice so it
 * is wider than any screen. It is decoration (the same words are on the page as real content), so
 * assistive technology skips it.
 */
export function FestiveRibbon({ items, className, tilt = -1.5 }: { items: { text: string; lang?: string }[]; className?: string; tilt?: number }) {
  const run = [...items, ...items];
  return (
    <div aria-hidden className={cn("ribbon relative z-10 -mx-4 overflow-hidden bg-maroon-600 py-3.5 shadow-[0_18px_30px_-20px_rgb(10_3_2/0.9)]", className)} style={{ rotate: `${tilt}deg` }}>
      <span className="absolute inset-x-0 top-1 h-[3px] bg-[repeating-linear-gradient(90deg,#f7d58c_0_10px,transparent_10px_18px)] opacity-70" />
      <span className="absolute inset-x-0 bottom-1 h-[3px] bg-[repeating-linear-gradient(90deg,#f7d58c_0_10px,transparent_10px_18px)] opacity-70" />
      <div className="ribbon-track flex w-max">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center">
            {run.map((item, i) => (
              <li key={`${copy}-${i}`} className="flex items-center gap-6 px-3">
                <span
                  lang={item.lang}
                  className={cn(
                    "whitespace-nowrap text-cream-100",
                    item.lang ? "hand text-[1.6rem] leading-none text-gold-300" : "font-display text-[1.35rem] uppercase tracking-[0.02em]",
                  )}
                >
                  {item.text}
                </span>
                <Marigold />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
