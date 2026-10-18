import { GameExperience } from "@/components/game/GameExperience";
import { PageHero } from "@/components/ui/PageHero";
import { getGameSettings, getRewardSettings } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = pageMetadata({
  title: "Catch the Koochu Puchu",
  description:
    "Play Catch the Koochu Puchu, the TERRA UTSAV Diwali stall game: five levels, free practice, and two reward attempts to win a coupon.",
  path: "/game",
});

export default async function GamePage() {
  const [settings, rewards] = await Promise.all([getGameSettings(), getRewardSettings()]);
  return (
    <>
      <PageHero
        title={
          <>
            Catch the
            {" "}<br />
            <span className="text-sticker-gold">Koochu Puchu.</span>
          </>
        }
        intro="Five levels of Diwali chaos. Practise for free, then use your reward attempts to win a coupon."
      />
      <section aria-label="The game" className="bg-burgundy-950 pb-24 pt-10 md:pb-32">
        <div className="shell">
          <GameExperience settings={settings} rewardsEnabled={rewards.rewardsEnabled} couponValueText={rewards.couponValueText} />
        </div>
      </section>
    </>
  );
}
