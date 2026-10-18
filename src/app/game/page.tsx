import { GameExperience } from "@/components/game/GameExperience";
import { PageHero } from "@/components/ui/PageHero";
import { getGameSettings, getRewardSettings } from "@/lib/data/public";
import { gameFacts } from "@/lib/game/copy";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = pageMetadata({
  title: "Catch the Koochu Puchu",
  description:
    "Play Catch the Koochu Puchu, the TERRA UTSAV Diwali stall game: three quick levels, free practice, and two reward attempts to win a coupon.",
  path: "/game",
});

export default async function GamePage() {
  const [settings, rewards] = await Promise.all([getGameSettings(), getRewardSettings()]);
  const facts = gameFacts(settings, rewards.couponValueText);
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
        intro={`${facts.levelsWord[0].toUpperCase()}${facts.levelsWord.slice(1)} quick levels of Diwali chaos, about a minute and a half of play. Practise for free, then use your reward attempts to win ${facts.prize}.`}
      />
      <section aria-label="The game" className="bg-burgundy-950 pb-24 pt-10 md:pb-32">
        <div className="shell">
          <GameExperience settings={settings} rewardsOpen={rewards.rewardsEnabled && rewards.confirmed} couponValueText={rewards.couponValueText} />
        </div>
      </section>
    </>
  );
}
