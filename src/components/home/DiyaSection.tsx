import { ArrowRight } from "lucide-react";
import { DiyaArt } from "@/components/art/DiyaArt";
import { RangoliArt } from "@/components/art/RangoliArt";
import { ButtonLink } from "@/components/ui/Button";
import { PaperNote } from "@/components/ui/PaperNote";
import { Reveal } from "@/components/ui/Reveal";
import { AVAILABILITY_LABEL, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

/** The homemade Diwali diyas corner of the stall. */
export function DiyaSection({ product }: { product: Product | undefined }) {
  if (!product) return null;
  const availability = product.availability === "coming_soon" ? "On sale on event day" : AVAILABILITY_LABEL[product.availability];
  return (
    <section aria-labelledby="diyas-home-title" className="section-pad relative isolate overflow-hidden bg-night">
      <div className="shell grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Reveal>
          <h2 id="diyas-home-title" className="display-l text-sticker">
            Light up
            {" "}<br />
            <span className="text-sticker-gold">your Diwali.</span>
          </h2>
          <p className="mt-6 max-w-lg text-[1.15rem] font-semibold leading-relaxed text-cream-100">
            Next to the Chocolate Bombs you will find our homemade diyas. Pick one for your doorstep, a few for your room, or a
            set to gift.
          </p>
          <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-3">
            <div>
              <dt className="text-[0.9rem] font-bold text-gold-300">Price</dt>
              <dd className="font-display text-[1.5rem] text-cream-100">{formatPrice(product.pricePaise, product.priceNote)}</dd>
            </div>
            <div>
              <dt className="text-[0.9rem] font-bold text-gold-300">Availability</dt>
              <dd className="font-display text-[1.5rem] text-cream-100">{availability}</dd>
            </div>
          </dl>
          <div className="mt-9">
            <ButtonLink href="/menu#diyas" size="lg" trailing={<ArrowRight />}>
              See the diyas
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal delay={100} className="relative">
          <figure className="relative mx-auto aspect-square w-full max-w-[500px]">
            <RangoliArt className="absolute inset-[4%] opacity-95" />
            <div className="absolute inset-[24%] rounded-full bg-[radial-gradient(circle,#2a0b10_55%,transparent_72%)]" />
            <div className="absolute inset-x-[14%] top-[42%] flex items-end justify-center gap-[2%]">
              <DiyaArt hue="maroon" delay={250} className="w-[28%]" />
              <DiyaArt hue="terracotta" className="w-[40%] -translate-y-[10%]" />
              <DiyaArt hue="gold" delay={600} className="w-[28%]" />
            </div>
            <div className="absolute -left-2 top-[2%]">
              <PaperNote rotate={-6} className="text-[1.2rem] md:text-[1.4rem]">
                Homemade
                {" "}<br />
                for Diwali!
              </PaperNote>
            </div>
            <figcaption className="absolute inset-x-0 -bottom-6 text-center text-[0.875rem] font-semibold text-cream-100/85">
              Illustration. Photos of the real diyas are coming.
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
