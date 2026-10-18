import { ArrowRight } from "lucide-react";
import { DiyaScene3D } from "@/components/three/DiyaScene3D";
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
              <dd className={product.pricePaise === null ? "pt-1 text-[1.05rem] font-bold text-cream-100" : "font-display text-[1.5rem] text-cream-100"}>
                {formatPrice(product.pricePaise, product.priceNote)}
              </dd>
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
          <figure className="relative mx-auto aspect-square w-full max-w-[540px]">
            <DiyaScene3D className="absolute inset-0" />
            <div className="pointer-events-none absolute -left-2 top-[2%] z-10">
              <PaperNote rotate={-6} className="text-[1.2rem] md:text-[1.4rem]">
                Homemade
                {" "}<br />
                for Diwali!
              </PaperNote>
            </div>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
