import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { AVAILABILITY_LABEL, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

/** Homepage preview of the menu: the two dishes, large. The full menu lives at /menu. */
export function FoodHighlights({ products }: { products: Product[] }) {
  const items = products.slice(0, 2);
  return (
    <section id="food" aria-labelledby="food-title" className="section-pad bg-cream-200 text-ink">
      <div className="shell">
        <Reveal className="max-w-3xl">
          <h2 id="food-title" className="display-l text-choc-900">
            Sweet or tangy?
            {" "}<br />
            Have both.
          </h2>
          <p className="mt-5 max-w-xl text-[1.12rem] font-semibold leading-relaxed text-ink">
            Two dishes at the counter, one dessert and one chaat. Prices go up on the menu as soon as the organisers
            confirm them.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-14 md:mt-20 md:gap-20">
          {items.map((p, i) => (
            <article
              key={p.id}
              className={cn("grid items-center gap-8 md:grid-cols-2 md:gap-14", i % 2 === 1 && "md:[&>*:first-child]:order-2")}
            >
              <Reveal>
                <figure className="relative overflow-hidden rounded-[var(--radius-panel)] bg-choc-900 shadow-[var(--shadow-card)]">
                  <div className="relative aspect-[4/5] w-full">
                    {p.imageUrl && (
                      <Image
                        src={p.imageUrl}
                        alt={p.imageAlt}
                        fill
                        sizes="(min-width: 768px) 45vw, 100vw"
                        className="object-cover transition-transform duration-700 ease-out hover:scale-[1.03]"
                      />
                    )}
                  </div>
                </figure>
              </Reveal>
              <Reveal delay={90}>
                <h3 className="display-m text-choc-900">{p.name}</h3>
                {p.tagline && <p className="hand mt-3 text-[1.6rem] text-maroon-600">{p.tagline}</p>}
                <p className="mt-4 max-w-md text-[1.08rem] leading-relaxed text-ink">{p.description}</p>
                <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-[1rem]">
                  <div>
                    <dt className="text-[0.9rem] font-bold text-ink-soft">Price</dt>
                    <dd className={p.pricePaise === null ? "pt-1 text-[1.05rem] font-bold text-ink" : "font-display text-[1.5rem] text-choc-900"}>
                      {formatPrice(p.pricePaise, p.priceNote)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.9rem] font-bold text-ink-soft">Availability</dt>
                    <dd className="font-display text-[1.5rem] text-choc-900">{AVAILABILITY_LABEL[p.availability]}</dd>
                  </div>
                </dl>
              </Reveal>
            </article>
          ))}
        </div>

        <Reveal className="mt-14 flex justify-center md:mt-20">
          <ButtonLink href="/menu" variant="dark" size="lg" trailing={<ArrowRight />}>
            See the full menu
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  );
}
