import { FestiveRibbon } from "@/components/art/FestiveRibbon";
import { AttractionCards } from "@/components/home/AttractionCards";
import { ChallengeTeaser } from "@/components/home/ChallengeTeaser";
import { DiyaSection } from "@/components/home/DiyaSection";
import { FinalCta } from "@/components/home/FinalCta";
import { FoodHighlights } from "@/components/home/FoodHighlights";
import { GameTeaser } from "@/components/home/GameTeaser";
import { Hero } from "@/components/home/Hero";
import { StallBand } from "@/components/home/StallBand";
import { DripDivider } from "@/components/ui/DripDivider";
import { JsonLd } from "@/components/seo/JsonLd";
import { getEventSettings, getGameSettings, getProducts, getRewardSettings } from "@/lib/data/public";
import { eventJsonLd, pageMetadata, websiteJsonLd } from "@/lib/seo";
import type { Metadata } from "next";

export const revalidate = 60;

const RIBBON = [
  { text: "Chocolate Bombs" },
  { text: "Chat Papdi" },
  { text: "Homemade Diyas" },
  { text: "शुभ दीपावली", lang: "mr" },
  { text: "60-Second Brick Challenge" },
  { text: "Catch Mini" },
  { text: "Happy Diwali" },
];

export async function generateMetadata(): Promise<Metadata> {
  const event = await getEventSettings();
  const when = [event.festivalName, event.dateText, event.venue?.split(",")[0]].filter(Boolean).join(" · ");
  const description = `TERRA UTSAV, our Diwali stall${when ? ` at ${when}` : ""}: Chocolate Bombs, Chat Papdi, homemade diyas, a 60-second wet-brick challenge and Catch Mini, a three-level game with a coupon for winners.`;
  return {
    ...pageMetadata({ title: "Came for the food, stayed for the chaos", description, path: "/" }),
    title: { absolute: `TERRA UTSAV: food, diyas, games and chaos${event.festivalName ? ` at ${event.festivalName}` : " this Diwali"}` },
  };
}

export default async function HomePage() {
  const [products, event, game, rewards] = await Promise.all([getProducts(), getEventSettings(), getGameSettings(), getRewardSettings()]);
  const prize = rewards.couponValueText;
  const eventLd = eventJsonLd(event);

  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      {eventLd && <JsonLd data={eventLd} />}
      <Hero event={event} game={game} prize={prize} />
      <div className="relative bg-choc-900">
        <AttractionCards products={products} game={game} prize={prize} />
        {/* Clip sideways only: the tilted ribbon runs past both edges of the window. */}
        <div className="overflow-x-clip pt-16 md:pt-20">
          <FestiveRibbon items={RIBBON} />
        </div>
      </div>
      <StallBand event={event} game={game} prize={prize} />
      <DripDivider from="var(--color-choc-900)" to="var(--color-cream-200)" />
      <FoodHighlights products={products.filter((p) => p.category === "food")} />
      <DiyaSection product={products.find((p) => p.category === "diyas")} />
      <ChallengeTeaser />
      <GameTeaser settings={game} prize={prize} />
      <FinalCta instagramUrl={event.instagramUrl} />
    </>
  );
}
