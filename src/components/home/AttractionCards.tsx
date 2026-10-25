import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BrickArt } from "@/components/art/BrickArt";
import { DiyaScene } from "@/components/art/DiyaScene";
import { Reveal } from "@/components/ui/Reveal";
import { Tilt } from "@/components/ui/Tilt";
import type { GameSettings } from "@/lib/game/config";
import { gameFacts } from "@/lib/game/copy";
import type { Product } from "@/lib/types";

interface Card {
  key: string;
  title: string;
  tagline: string;
  href: string;
  cta: string;
  media: React.ReactNode;
}

/**
 * The cream card strip that overlaps the bottom of the hero in the approved design, now with
 * five attractions: the two dishes, the homemade Diwali diyas, the brick challenge and the game.
 */
export function AttractionCards({ products, game, prize = null }: { products: Product[]; game: GameSettings; prize?: string | null }) {
  const facts = gameFacts(game, prize);
  const bomb = products.find((p) => p.slug === "chocolate-bomb");
  const ponge = products.find((p) => p.slug === "aalu-ponge");
  const diyas = products.find((p) => p.category === "diyas");

  const cards: Card[] = [
    {
      key: "bomb",
      title: bomb?.name ?? "Chocolate Bomb",
      tagline: bomb?.tagline ?? "Crack it. Pour it. Devour it.",
      href: "/menu#chocolate-bomb",
      cta: "View item",
      media: <Image src={bomb?.imageUrl ?? "/images/food/chocolate-bomb.webp"} alt="" fill sizes="160px" className="object-cover" />,
    },
    {
      key: "ponge",
      title: ponge?.name ?? "Aalu Ponge",
      tagline: ponge?.tagline ?? "Crispy. Spicy. Loaded.",
      href: "/menu#aalu-ponge",
      cta: "View item",
      media: <Image src={ponge?.imageUrl ?? "/images/food/aalu-ponge.webp"} alt="" fill sizes="160px" className="object-cover" />,
    },
    {
      key: "diyas",
      title: "Homemade Diyas",
      tagline: diyas?.tagline ?? "Light one. Gift one. Glow on.",
      href: "/menu#diyas",
      cta: "See diyas",
      media: diyas?.imageUrl ? <Image src={diyas.imageUrl} alt="" fill sizes="160px" className="object-cover" /> : <DiyaScene compact />,
    },
    {
      key: "brick",
      title: "60-Second Brick Challenge",
      tagline: "One wet brick. One hand. Don't drop it.",
      href: "/challenge",
      cta: "Learn more",
      media: (
        <div className="absolute inset-0 grid place-items-center bg-burgundy-800">
          <BrickArt className="w-[86%]" title="" />
        </div>
      ),
    },
    {
      key: "game",
      title: "Catch Mini",
      tagline: prize ? `${facts.levels} levels. Win ${prize}!` : `${facts.levels} levels. ${facts.attempts} attempts. Win a prize!`,
      href: "/game",
      cta: "Play now",
      media: (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,#7a1a2a,#3a0f17)]">
          <Image src="/images/mascot/koochu-idle.webp" alt="" fill sizes="160px" className="object-contain object-bottom pt-2" />
        </div>
      ),
    },
  ];

  return (
    <section id="attractions" aria-labelledby="attractions-title" className="relative z-20 -mt-32 md:-mt-40 lg:-mt-48">
      <h2 id="attractions-title" className="sr-only">
        At the stall this Diwali
      </h2>
      <div className="shell">
        <ul className="grid gap-2 rounded-[30px] bg-cream-100 p-2.5 shadow-[var(--shadow-lift)] sm:grid-cols-2 sm:gap-3 sm:p-3 lg:grid-cols-3 xl:grid-cols-5">
          {cards.map((card, i) => (
            <Reveal as="li" key={card.key} delay={i * 70} className={i === 4 ? "sm:col-span-2 lg:col-span-1" : undefined}>
              <Tilt className="h-full">
                <Link
                  href={card.href}
                  className="group flex h-full items-center gap-4 rounded-[22px] p-2 text-ink transition-colors duration-200 [transform-style:preserve-3d] hover:bg-cream-50 xl:flex-col xl:items-stretch xl:gap-3 xl:p-2.5"
                >
                  <span
                    data-depth="near"
                    className="relative aspect-square w-[34%] max-w-[140px] shrink-0 overflow-hidden rounded-[18px] bg-choc-800 transition-transform duration-300 ease-out group-hover:scale-[1.03] xl:aspect-[4/3] xl:w-full xl:max-w-none"
                  >
                    {card.media}
                  </span>
                  <span data-depth="mid" className="flex min-w-0 flex-1 flex-col items-start gap-2 py-1 xl:px-1.5 xl:pb-2">
                    <span className="font-display text-[1.45rem] leading-[0.98] xl:text-[1.4rem]">{card.title}</span>
                    <span className="text-[0.92rem] font-bold leading-snug text-ink-soft">{card.tagline}</span>
                    <span className="mt-auto inline-flex items-center gap-2 rounded-full bg-choc-800 px-3.5 py-2 font-display text-[0.86rem] uppercase tracking-[0.03em] text-cream-100 shadow-[0_3px_0_var(--color-choc-950)] transition-transform duration-150 group-hover:-translate-y-0.5">
                      {card.cta}
                      <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </Link>
              </Tilt>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
