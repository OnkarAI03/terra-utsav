import { cn } from "@/lib/cn";
import { PawIcon } from "./PawIcon";

/** "TERRA UTSAV" set in type (never an image), sticker style, with the paw mark. */
export function Wordmark({ className, size = "md", stacked = false }: { className?: string; size?: "sm" | "md" | "lg" | "xl"; stacked?: boolean }) {
  const sizes = {
    sm: "text-[1.35rem]",
    md: "text-[1.6rem] md:text-[1.9rem]",
    lg: "text-[2.6rem] md:text-[3.4rem]",
    xl: "text-[clamp(2.9rem,11.4vw,10.5rem)]",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-[0.18em] font-display leading-none", sizes[size], className)}>
      <span className={cn("text-sticker whitespace-nowrap", stacked && "flex flex-col leading-[0.86]")}>
        {stacked ? (
          <>
            <span>TERRA</span>
            <span>UTSAV</span>
          </>
        ) : (
          "TERRA UTSAV"
        )}
      </span>
      <PawIcon className="h-[0.62em] w-[0.62em] shrink-0 text-gold-300 drop-shadow-[0_0.06em_0_var(--color-choc-900)]" />
    </span>
  );
}
