import Link from "next/link";
import { EventFacts } from "@/components/home/EventFacts";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { CHALLENGE } from "@/content/challenge";
import { getEventSettings, getGameSettings, getRewardSettings } from "@/lib/data/public";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { gameFacts } from "@/lib/game/copy";
import { eventDayText } from "@/lib/game/window";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = pageMetadata({
  title: "Rules",
  description: "Rules for the TERRA UTSAV stall: the Catch Mini game, prizes, the wet-brick challenge and how we use your data.",
  path: "/rules",
});

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <Reveal as="section">
      <div id={id} tabIndex={-1} className="anchor-target rounded-[var(--radius-panel)] bg-cream-100 p-7 text-ink shadow-[var(--shadow-card)] md:p-10">
        <h2 className="display-m text-choc-900">{title}</h2>
        <div className="mt-6 flex max-w-[68ch] flex-col gap-4 text-[1.05rem] leading-relaxed [&_li]:relative [&_li]:pl-6 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-3">
          {children}
        </div>
      </div>
    </Reveal>
  );
}

function Dot() {
  return <span aria-hidden className="absolute left-0 top-[0.62em] h-2 w-2 rounded-full bg-maroon-600" />;
}

export default async function RulesPage() {
  const [event, game, rewards] = await Promise.all([getEventSettings(), getGameSettings(), getRewardSettings()]);
  const attempts = game.maxRewardAttempts;
  const eventDay = eventDayText(event);
  const facts = gameFacts(game);
  // Without the database, prizes are won on the phone and collected from the team (src/lib/game/prize.ts).
  const offline = !isSupabaseConfigured();
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
              ["#coupons", offline ? "Prizes" : "Coupons"],
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

          <Block id="game" title="Catch Mini">
            {offline ? (
              <ul>
                <li>
                  <Dot />
                  Practice mode is free and unlimited. It never wins a prize.
                </li>
                <li>
                  <Dot />
                  No sign-up needed: just tap Play for a prize. Each phone gets {attempts} prize {attempts === 1 ? "attempt" : "attempts"}.
                  Prize play is open now and closes when the event ends.
                </li>
                <li>
                  <Dot />
                  You can also play on our laptops and phone at the stall. There, each player gets the same {attempts} prize{" "}
                  {attempts === 1 ? "attempt" : "attempts"}, and our team starts the game for the next player.
                </li>
                <li>
                  <Dot />
                  An attempt is {facts.levelsWord} levels played in a row. Lose a level and that attempt ends. Clear Level {facts.lastLevel} to
                  win.
                </li>
                <li>
                  <Dot />
                  Once a level starts it must be finished: leaving, refreshing or closing the page during a level ends that attempt.
                </li>
                <li>
                  <Dot />
                  Tapping a snack instead of the kitten costs a heart. Lose all your hearts, or run out of time, and the level is lost.
                </li>
                <li>
                  <Dot />
                  It is meant to be hard, so practise first. Our team may ask to see you play before handing over a prize.
                </li>
              </ul>
            ) : (
              <ul>
                <li>
                  <Dot />
                  Practice mode is free and unlimited. It never awards coupons.
                </li>
                <li>
                  <Dot />
                  No sign-up needed: just tap Play for a reward. Coupons can be won on event day only
                  {eventDay ? ` (${eventDay})` : ""}. Each phone or browser gets {attempts} reward{" "}
                  {attempts === 1 ? "attempt" : "attempts"}. The organisers may add an extra attempt if something went wrong on our side.
                </li>
                <li>
                  <Dot />
                  An attempt is {facts.levelsWord} levels played in order. Fail a level and that attempt ends. Clear Level{" "}
                  {facts.lastLevel} to win.
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
                  reactions, automated tapping) do not count. Bots and scripts may be disqualified.
                </li>
                <li>
                  <Dot />
                  It is meant to be hard: we expect roughly 2 or 3 players in 10 to win across their attempts, so practise first.
                </li>
              </ul>
            )}
          </Block>

          {offline ? (
            <Block id="coupons" title="Prizes">
              <ul>
                <li>
                  <Dot />
                  Win a prize attempt and you see &ldquo;Congratulations! You won!&rdquo; with a winner card. It also stays under{" "}
                  <Link href="/rewards" className="font-extrabold text-maroon-600 underline underline-offset-4">
                    My prize
                  </Link>{" "}
                  on the phone and browser you played on.
                </li>
                <li>
                  <Dot />
                  Collect your prize from the TERRA UTSAV team at the stall{eventDay ? ` (${eventDay})` : ""}.
                  {rewards.couponValueText ? ` What you win: ${rewards.couponValueText}.` : ""}
                </li>
                <li>
                  <Dot />
                  Show the winner card live on your phone. Its clock keeps ticking, so screenshots and forwarded photos don&apos;t count. A
                  team member hands over the prize and taps Prize given.
                </li>
                <li>
                  <Dot />
                  <strong>One prize per person.</strong> Winning again on another phone or browser doesn&apos;t get you a second prize at the
                  stall.
                </li>
                <li>
                  <Dot />
                  Clearing your browser&apos;s data deletes the winner card, so collect your prize first.
                </li>
              </ul>
            </Block>
          ) : (
            <Block id="coupons" title="Coupons">
              <ul>
                <li>
                  <Dot />
                  Win a reward attempt and your coupon appears on screen. It also stays in{" "}
                  <Link href="/rewards" className="font-extrabold text-maroon-600 underline underline-offset-4">
                    My coupons
                  </Link>{" "}
                  on the phone and browser you played on.
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
                  A team member redeems it by scanning or typing the code. Keep your code to yourself: a coupon works once, for
                  whoever shows it first.
                </li>
                <li>
                  <Dot />
                  <strong>One coupon per person.</strong> Playing again on another phone or browser can win another coupon on screen,
                  but our team redeems only one coupon for each person at the stall.
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
          )}

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
              {offline ? (
                <li>
                  <Dot />
                  Players don&apos;t sign up. Prize play keeps its record (attempts used and any winner card) only on your phone, in this
                  browser. Nothing about your game is sent to us.
                </li>
              ) : (
                <>
                  <li>
                    <Dot />
                    Players don&apos;t sign up. When you play for a reward, this site gives your phone a random player ID and keeps your
                    game attempts and results and any coupon you win. No name, email address or phone number.
                  </li>
                  <li>
                    <Dot />
                    Clearing your browser&apos;s data, or switching browsers, loses that player ID, along with My coupons on that phone.
                    A coupon already won still works if you have the code: write it down or take a screenshot.
                  </li>
                </>
              )}
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
