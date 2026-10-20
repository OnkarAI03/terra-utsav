import Image from "next/image";
import { cn } from "@/lib/cn";

export const LOGO = { src: "/images/brand/terra-utsav-logo.webp", width: 1158, height: 900 } as const;

/**
 * The stall's sign: the TERRA UTSAV logo printed on a cream banner, hanging on two cords. Used
 * where it helps people recognise the stall (the Find us card), not as page chrome. It sways a
 * little, like a banner outdoors; under reduced motion it hangs still.
 */
export function LogoSign({ className, caption = "Look for this sign at the Mandi" }: { className?: string; caption?: string | null }) {
  return (
    <figure className={cn("relative", className)}>
      <div className="logo-sign relative pt-6">
        <span aria-hidden className="absolute left-[16%] top-0 h-8 w-[3px] origin-bottom rotate-[18deg] rounded-full bg-cream-300/80" />
        <span aria-hidden className="absolute right-[16%] top-0 h-8 w-[3px] origin-bottom -rotate-[18deg] rounded-full bg-cream-300/80" />
        <div className="rounded-[20px] bg-[#f8ebd8] p-2 shadow-[var(--shadow-lift)] ring-2 ring-gold-400/70">
          <Image
            src={LOGO.src}
            alt="TERRA UTSAV logo: the name in festive lettering under arches, a sun and a toran"
            width={LOGO.width}
            height={LOGO.height}
            sizes="(min-width: 1024px) 340px, 80vw"
            className="h-auto w-full rounded-[14px]"
          />
        </div>
      </div>
      {caption && <figcaption className="hand mt-3 text-balance text-center text-[1.15rem] text-gold-300">{caption}</figcaption>}
    </figure>
  );
}
