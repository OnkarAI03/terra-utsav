import { cn } from "@/lib/cn";

/**
 * Chocolate dripping from one section into the next. `from` is the colour of the section above
 * (it forms the drips), `to` the section below (the background behind them).
 */
export function DripDivider({
  from = "var(--color-choc-900)",
  to = "var(--color-cream-200)",
  className,
}: {
  from?: string;
  to?: string;
  className?: string;
}) {
  // Each drip: [x centre, length, width]. Lengths vary so the edge looks poured, not stamped.
  const drips: [number, number, number][] = [
    [70, 46, 26], [190, 22, 18], [300, 64, 30], [420, 30, 20], [540, 52, 26], [650, 18, 16],
    [760, 70, 32], [880, 34, 22], [990, 56, 28], [1100, 24, 18], [1210, 62, 30], [1330, 38, 22], [1420, 20, 14],
  ];
  return (
    <div aria-hidden className={cn("relative -my-px leading-[0]", className)} style={{ background: to }}>
      <svg viewBox="0 0 1440 96" preserveAspectRatio="none" className="block h-[48px] w-full md:h-[80px]">
        <path d="M0 0 H1440 V18 C1300 24 1180 14 1040 20 C900 26 780 16 640 22 C500 28 360 16 220 22 C140 25 60 20 0 22 Z" fill={from} />
        {drips.map(([x, len, w], i) => (
          <path
            key={i}
            d={`M${x - w / 2 - 10} 18 C${x - w / 2} 20 ${x - w / 2} ${18 + len * 0.55} ${x - w / 2} ${18 + len - w / 2}
                A${w / 2} ${w / 2} 0 0 0 ${x + w / 2} ${18 + len - w / 2}
                C${x + w / 2} ${18 + len * 0.55} ${x + w / 2} 20 ${x + w / 2 + 10} 18 Z`}
            fill={from}
          />
        ))}
      </svg>
    </div>
  );
}
