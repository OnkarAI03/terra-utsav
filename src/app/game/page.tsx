import { GameExperience } from "@/components/game/GameExperience";
import { PageHero } from "@/components/ui/PageHero";
import { getEventSettings, getGameSettings, getRewardSettings } from "@/lib/data/public";
import { gameFacts } from "@/lib/game/copy";
import { eventDayText } from "@/lib/game/window";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = pageMetadata({
  title: "Catch Mini",
  description:
    "Play Catch Mini, the TERRA UTSAV Diwali stall game: three quick levels, free practice, and two attempts to win a prize.",
  path: "/game",
});

export default async function GamePage() {
  const [settings, rewards, event] = await Promise.all([getGameSettings(), getRewardSettings(), getEventSettings()]);
  const facts = gameFacts(settings, rewards.couponValueText);
  return (
    <>
      <PageHero
        title={
          <>
            Catch
            {" "}<br />
            <span className="text-sticker-gold">Mini.</span>
          </>
        }
        intro={`${facts.levelsWord[0].toUpperCase()}${facts.levelsWord.slice(1)} quick levels of Diwali chaos, about a minute and a half of play. Practise for free, then play for real to win ${facts.prize}.`}
      />
      <section aria-label="The game" className="bg-burgundy-950 pb-24 pt-10 md:pb-32">
        <div className="shell">
          <GameExperience settings={settings} eventDay={eventDayText(event)} couponValueText={rewards.couponValueText} eventEndsAt={event.endsAt} />
        </div>
      </section>
    </>
  );
}
