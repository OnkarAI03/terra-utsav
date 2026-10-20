import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="festival-ground grid min-h-[80vh] place-items-center px-[var(--gutter)] pb-16 pt-[calc(var(--header-h)+48px)] text-center">
      <div className="max-w-xl">
        <Image src="/images/mascot/koochu-oops.webp" alt="" width={271} height={315} className="mx-auto w-[150px]" priority />
        <h1 className="display-l text-sticker mt-6">Mini ran off with this page.</h1>
        <p className="mt-4 text-[1.1rem] font-semibold text-cream-100">The page you wanted is not here. Try the stall instead.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/" trailing={<ArrowRight />}>
            Back to the stall
          </ButtonLink>
          <ButtonLink href="/game" variant="secondary">
            Play the game
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
