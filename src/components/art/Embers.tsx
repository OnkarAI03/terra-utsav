import { cn } from "@/lib/cn";

/**
 * Warm embers drifting up from the diyas, like the night air above a Diwali stall. Pure CSS
 * (off the main thread), hidden under reduced motion. Positions are fixed so server and client
 * render the same markup.
 */
const EMBERS = [
  [8, 0.0, 9, 5], [14, 2.1, 11, 3], [22, 4.0, 10, 4], [31, 1.2, 12, 3], [38, 5.5, 9, 5], [47, 3.1, 13, 3],
  [55, 0.7, 10, 4], [61, 6.2, 11, 3], [68, 2.6, 12, 5], [74, 4.8, 9, 3], [81, 1.7, 10, 4], [88, 3.9, 12, 3],
  [93, 5.1, 11, 4], [4, 6.6, 13, 3], [51, 7.3, 10, 3], [27, 8.0, 12, 4],
] as const;

export function Embers({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("embers pointer-events-none overflow-hidden", className)}>
      {EMBERS.map(([left, delay, duration, size], i) => (
        <span
          key={i}
          className="ember absolute bottom-0 block rounded-full"
          style={{ left: `${left}%`, width: size, height: size, animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
        />
      ))}
    </div>
  );
}
