import { cn } from "@/lib/cn";
import { DiyaArt } from "./DiyaArt";
import { RangoliArt } from "./RangoliArt";

/**
 * Illustrated stand-in for the homemade diyas until real photos are uploaded: a rangoli on the
 * floor with three lit diyas. Fills its positioned parent.
 */
export function DiyaScene({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_62%,#5a1422_0%,#2a0b10_70%)]", className)}>
      <RangoliArt className="absolute left-1/2 top-[64%] w-[118%] max-w-none opacity-60 [transform:translate(-50%,-50%)_scaleY(0.42)]" />
      <div className={cn("absolute inset-x-0 flex items-end justify-center", compact ? "bottom-[22%] gap-[2%]" : "bottom-[24%] gap-[4%]")}>
        <DiyaArt hue="maroon" delay={300} className="w-[26%] translate-y-[6%]" />
        <DiyaArt hue="terracotta" className="w-[38%]" />
        <DiyaArt hue="gold" delay={650} className="w-[26%] translate-y-[6%]" />
      </div>
    </div>
  );
}
