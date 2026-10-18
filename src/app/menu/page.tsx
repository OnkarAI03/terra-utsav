import { Info } from "lucide-react";
import { DiyaRow } from "@/components/art/DiyaArt";
import { ProductCard } from "@/components/menu/ProductCard";
import { BombScene3D } from "@/components/three/BombScene3D";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { getProducts } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = pageMetadata({
  title: "Menu and Diwali Diyas",
  description:
    "The TERRA UTSAV Diwali stall menu: Chocolate Bomb and Chat Papdi, plus homemade Diwali diyas to take home.",
  path: "/menu",
});

export default async function MenuPage() {
  const products = await getProducts();
  const food = products.filter((p) => p.category === "food");
  const diyas = products.filter((p) => p.category === "diyas");
  const hasUnconfirmedPrices = products.some((p) => p.pricePaise === null);

  return (
    <>
      <PageHero
        title={
          <>
            The Menu
            {" "}<br />
            <span className="text-sticker-gold">and the Diyas.</span>
          </>
        }
        intro="Short menu, big chaos, plus homemade diyas to carry the Diwali glow home."
        art={<BombScene3D />}
      >
        <nav aria-label="Menu sections" className="flex flex-wrap gap-2">
          <a href="#to-eat" className="rounded-full bg-cream-100 px-4 py-2 font-extrabold text-ink hover:bg-cream-50">
            To eat
          </a>
          <a href="#diyas" className="rounded-full border-2 border-cream-100/80 px-4 py-2 font-extrabold text-cream-100 hover:bg-cream-100 hover:text-ink">
            Diwali diyas
          </a>
        </nav>
      </PageHero>

      <section id="to-eat" tabIndex={-1} aria-labelledby="to-eat-title" className="anchor-target bg-cream-200 pb-20 pt-14 text-ink md:pb-28 md:pt-20">
        <div className="shell">
          <Reveal>
            <h2 id="to-eat-title" className="display-m text-choc-900">
              To eat
            </h2>
          </Reveal>
          {food.length === 0 ? (
            <p className="mt-6 text-[1.05rem]">The menu is being written. Check back soon.</p>
          ) : (
            <div className="mt-8 grid gap-8 md:gap-10 lg:grid-cols-2">
              {food.map((p, i) => (
                <Reveal key={p.id} delay={i * 80}>
                  <ProductCard product={p} priority={i === 0} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="diyas" tabIndex={-1} aria-labelledby="diyas-title" className="anchor-target festival-ground relative overflow-hidden pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="shell">
          <Reveal className="max-w-2xl">
            <h2 id="diyas-title" className="display-l text-sticker">
              Homemade
              {" "}<br />
              <span className="text-sticker-gold">Diwali diyas.</span>
            </h2>
            <p className="mt-5 text-[1.12rem] font-semibold leading-relaxed text-cream-100">
              Take a little light home. Our homemade diyas are on sale at the stall, right next to the chocolate.
            </p>
          </Reveal>
          {diyas.length === 0 ? (
            <p className="mt-6 text-[1.05rem] text-cream-100">Diyas will be listed here soon.</p>
          ) : (
            <div className="mt-10 grid gap-8 md:gap-10 lg:grid-cols-2">
              {diyas.map((p, i) => (
                <Reveal key={p.id} delay={i * 80}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          )}
          <DiyaRow count={9} className="mt-16 w-full" />
        </div>
      </section>

      <section aria-label="Before you order" className="bg-cream-200 py-14 text-ink">
        <div className="shell">
          <Reveal className="flex max-w-3xl gap-4 rounded-[var(--radius-card)] bg-cream-100 p-6 md:p-7">
            <Info aria-hidden className="mt-0.5 h-6 w-6 shrink-0 text-maroon-600" />
            <div className="text-[1.02rem] leading-relaxed">
              <p className="font-extrabold">Allergies or dietary needs?</p>
              <p className="mt-1">
                Please ask a TERRA UTSAV team member about ingredients before you order. We would rather answer a question than
                guess. Lighting a diya? Keep it away from anything that can catch fire and never leave a flame unattended.
              </p>
              {hasUnconfirmedPrices && <p className="mt-2">Prices appear here as soon as the organisers confirm them.</p>}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
