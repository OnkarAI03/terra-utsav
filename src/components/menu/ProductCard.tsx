import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";
import { DiyaScene } from "@/components/art/DiyaScene";
import { cn } from "@/lib/cn";
import { AVAILABILITY_LABEL, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({ product, priority = false, headingLevel = 3 }: { product: Product; priority?: boolean; headingLevel?: 2 | 3 }) {
  const soldOut = product.availability === "sold_out";
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const availability = product.category === "diyas" && product.availability === "coming_soon" ? "On sale on event day" : AVAILABILITY_LABEL[product.availability];

  return (
    <article
      id={product.slug}
      tabIndex={-1}
      aria-labelledby={`${product.slug}-name`}
      className="anchor-target group overflow-hidden rounded-[var(--radius-panel)] bg-cream-100 text-ink shadow-[var(--shadow-card)]"
    >
      <figure className="relative aspect-[4/5] w-full overflow-hidden bg-choc-900 sm:aspect-[5/4] lg:aspect-[4/5]">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt || product.name}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 40vw, (min-width: 640px) 80vw, 100vw"
            className={cn("object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]", soldOut && "grayscale")}
          />
        ) : product.category === "diyas" ? (
          <div role="img" aria-label="Illustration of lit diyas on a rangoli" className="absolute inset-0">
            <DiyaScene />
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-cream-100/80">
            <div className="flex flex-col items-center gap-2">
              <UtensilsCrossed aria-hidden className="h-10 w-10" />
              <span className="text-[0.95rem] font-bold">Photo coming soon</span>
            </div>
          </div>
        )}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {product.featured && (
            <span className="rounded-full bg-maroon-600 px-3 py-1 text-[0.85rem] font-extrabold text-cream-100">
              {product.featuredLabel ?? "Featured"}
            </span>
          )}
          <span
            className={cn(
              "rounded-full px-3 py-1 text-[0.85rem] font-extrabold",
              product.availability === "available" && "bg-success text-ink",
              product.availability === "sold_out" && "bg-choc-900 text-cream-100",
              product.availability === "coming_soon" && "bg-cream-100 text-ink",
            )}
          >
            {availability}
          </span>
        </div>
      </figure>
      <div className="flex flex-col gap-3 p-6 md:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <Heading id={`${product.slug}-name`} className="display-m text-choc-900">
            {product.name}
          </Heading>
          {/* A missing price is said plainly, not in display type. */}
          <p className={product.pricePaise === null ? "text-[1rem] font-bold text-ink-soft" : "font-display text-[1.6rem] text-maroon-600"}>
            {formatPrice(product.pricePaise, product.priceNote)}
          </p>
        </div>
        {product.tagline && <p className="hand text-[1.45rem] text-maroon-600">{product.tagline}</p>}
        {product.description && <p className="max-w-prose text-[1.05rem] leading-relaxed text-ink">{product.description}</p>}
      </div>
    </article>
  );
}
