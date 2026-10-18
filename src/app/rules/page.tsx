import Link from "next/link";
import { EventFacts } from "@/components/home/EventFacts";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { CHALLENGE } from "@/content/challenge";
import { getEventSettings, getGameSettings, getRewardSettings } from "@/lib/data/public";
import { formatDateTime } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = pageMetadata({
  title: "Rules",
  description: "Rules for the TERRA UTSAV stall: the Catch the Koochu Puchu game, reward coupons, the wet-brick challenge and how we use your data.",
  path: "/rules",
});

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <Reveal as="section" className="scroll-mt-28">
      <div id={id} className="scroll-mt-28 rounded-[var(--radius-panel)] bg-cream-100 p-7 text-ink shadow-[var(--shadow-card)] md:p-10">
        <h2 className="display-m text-choc-900">{title}</h2>
        <div className="mt-6 flex flex-col gap-4 text-[1.05rem] leading-relaxed [&_li]:flex [&_li]:gap-3 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-3">
          {children}
        </div>
      </div>
    </Reveal>
  );
}

function Dot() {
  return <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-maroon-600" />;
}

export default async function RulesPage() {
  const [event, game, rewards] = await Promise.all([getEventSettings(), getGameSettings(), getRewardSettings()]);
  const attempts = game.maxRewardAttempts;
  const expiry = rewards.expiresAt
    ? `Coupons expire on ${formatDateTime(rewards.expiresAt)}.`
    : rewards.expiresAfterHours
      ? `Coupons expire ${rewards.expiresAfterHours} hours after they are issued.`
      : "No expiry has been set yet. The organisers will confirm it before the event.";

  return (
    <>
      <PageHero title="The Rules" intro="Fair play for everyone. The short version: have fun, play honestly, and listen to our team." />

      <div className="bg-cream-200 pb-24 pt-14 md:pb-32 md:pt-20">
        <div className="shell flex max-w-4xl flex-col gap-8">
          <nav aria-label="On this page" className="flex flex-wrap gap-2">
            {[
              ["#event", "The event"],
              ["#game", "The game"],
              ["#coupons", "Coupons"],
              ["#challenge", "Brick challenge"],
              ["#privacy", "Your data"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-full bg-choc-800 px-4 py-2 text-[0.95rem] font-extrabold text-cream-100 hover:bg-choc-700">
                {label}
              </a>
            ))}
          </nav>

          <Block id="event" title="The event">
            <EventFacts event={event} tone="light" />
            <ul>
              <li>
                <Dot />
                Please follow the directions of TERRA UTSAV team members and festival organisers at all times.
              </li>
              <li>
                <Dot />
                The organisers make the final call on anything these rules do not cover.
              </li>
            </ul>
          </Block>

          <Block id="game" title="Catch the Koochu Puchu">
            <ul>
              <li>
                <Dot />
                Practice mode is free and unlimited. It never awards coupons.
              </li>
              <li>
                <Dot />
                Reward play needs you to sign in. Each student gets {attempts} reward {attempts === 1 ? "attempt" : "attempts"}. The
                organisers may add an extra attempt if something went wrong on our side.
              </li>
              <li>
                <Dot />
                An attempt is five levels played in order. Fail a level and that attempt ends. Clear Level 5 to win.
              </li>
              <li>
                <Dot />
                You can pause between levels and come back later. Once a level starts it must be finished: leaving, refreshing or
                closing the page during a level ends that attempt.
              </li>
              <li>
                <Dot />
                Tapping a snack instead of the kitten costs a heart. Lose all your hearts, or run out of time, and the level is lost.
              </li>
              <li>
                <Dot />
                Every tap is checked on our server. Results that could not have happened (faster than real time, inhumanly quick
                reactions, automated tapping) do not count. Bots, scripts and multiple accounts may be disqualified.
              </li>
              <li>
                <Dot />
                It is meant to be hard. We expect only some players to clear Level 5, so practise first.
              </li>
            </ul>
          </Block>

          <Block id="coupons" title="Coupons">
            <ul>
              <li>
                <Dot />
                Winning a reward attempt issues one coupon to your account. You will find it in{" "}
                <Link href="/rewards" className="font-extrabold text-maroon-600 underline underline-offset-4">
                  My coupons
                </Link>
                .
              </li>
              <li>
                <Dot />
                What it is worth: {rewards.couponValueText ?? "to be announced by the organisers"}.
              </li>
              <li>
                <Dot />
                {rewards.maxRedemptions === 1
                  ? "Each coupon can be redeemed once."
                  : `Each coupon can be redeemed ${rewards.maxRedemptions} times.`}{" "}
                A team member redeems it by scanning or typing the code. Showing a screenshot of someone else&apos;s coupon will not
                work; codes are tied to the account that won them.
              </li>
              <li>
                <Dot />
                {expiry}
              </li>
              {rewards.maxCouponsTotal !== null && (
                <li>
                  <Dot />
                  There are {rewards.maxCouponsTotal} coupons in total. When they run out, winners are still celebrated but no new
                  coupons are issued.
                </li>
              )}
              <li>
                <Dot />
                {rewards.redemptionInstructions}
              </li>
            </ul>
            {!rewards.confirmed && (
              <p className="rounded-2xl bg-gold-300 px-4 py-3 text-[0.98rem] font-bold">
                Coupon terms are provisional until the organisers confirm them.
              </p>
            )}
          </Block>

          <Block id="challenge" title="The wet-brick challenge">
            <p>
              Hold one wet brick in a single hand for {CHALLENGE.durationSeconds} seconds, supervised by our staff. Full steps and
              safety notes are on the{" "}
              <Link href="/challenge" className="font-extrabold text-maroon-600 underline underline-offset-4">
                challenge page
              </Link>
              .
            </p>
            <ul>
              {CHALLENGE.safety.slice(0, 3).map((rule) => (
                <li key={rule}>
                  <Dot />
                  {rule}
                </li>
              ))}
            </ul>
            {!CHALLENGE.rulesApproved && (
              <p className="rounded-2xl bg-gold-300 px-4 py-3 text-[0.98rem] font-bold">
                Challenge rules are a draft waiting for organiser approval.
              </p>
            )}
          </Block>

          <Block id="privacy" title="Your data">
            <ul>
              <li>
                <Dot />
                To play for rewards we keep your email address (to sign you in), your game attempts and results, and any coupons you
                win and redeem. Nothing else.
              </li>
              <li>
                <Dot />
                When a team member checks your coupon they see a shortened version of your email (like &ldquo;ab***@college.edu&rdquo;),
                never the whole thing.
              </li>
              <li>
                <Dot />
                Team photos on this site are published only with each person&apos;s consent.
              </li>
              {event.contactEmail && (
                <li>
                  <Dot />
                  Questions or a request to delete your data: <a className="font-extrabold underline" href={`mailto:${event.contactEmail}`}>{event.contactEmail}</a>
                </li>
              )}
            </ul>
          </Block>
        </div>
      </div>
    </>
  );
}
