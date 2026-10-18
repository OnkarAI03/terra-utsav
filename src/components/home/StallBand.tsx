import { BrickWall, CakeSlice, Flame, MapPin, Ticket } from "lucide-react";
import Image from "next/image";
import { MapArt } from "@/components/art/MapArt";
import { InstagramLink } from "@/components/brand/InstagramLink";
import { LogoSign } from "@/components/brand/LogoSign";
import { PaperNote } from "@/components/ui/PaperNote";
import { Reveal } from "@/components/ui/Reveal";
import type { GameSettings } from "@/lib/game/config";
import { gameFacts } from "@/lib/game/copy";
import type { EventSettings } from "@/lib/settings";
import { EventFacts } from "./EventFacts";

const REASONS = [
  { icon: CakeSlice, title: "Delicious Food", body: "Chocolate Bombs and Chat Papdi at the counter." },
  { icon: Flame, title: "Homemade Diyas", body: "Take a little Diwali light home with you." },
  { icon: BrickWall, title: "Fun Challenges", body: "Hold one wet brick in one hand for sixty seconds." },
];

/** "What's happening at our stall?" with the Find Us card, from the approved design. */
export function StallBand({ event, game, prize = null }: { event: EventSettings; game: GameSettings; prize?: string | null }) {
  const facts = gameFacts(game, prize);
  const reasons = [
    ...REASONS,
    { icon: Ticket, title: "Exciting Coupons", body: `Clear all ${facts.levelsWord} levels of the game to win ${facts.prize}.` },
  ];
  return (
    <section aria-labelledby="happening-title" className="relative overflow-hidden bg-choc-900 pb-20 pt-20 md:pt-28">
      <div className="shell">
        <div className="grid items-center gap-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-14">
          {/* The whole kitten (the full-resolution mascot), asking the question in a paper note. */}
          <div className="relative flex items-end">
            <Image
              src="/images/mascot/koochu-idle.webp"
              alt=""
              width={762}
              height={1000}
              sizes="160px"
              className="w-[124px] shrink-0 md:w-[156px]"
            />
            <PaperNote as="h2" rotate={-5} className="relative -ml-3 mb-[72px] text-[1.5rem] md:mb-[92px] md:text-[1.85rem]">
              <span id="happening-title">
                What&apos;s happening
                {" "}<br />
                at our stall?
              </span>
            </PaperNote>
          </div>

          <ul className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-4">
            {reasons.map(({ icon: Icon, title, body }, i) => (
              <Reveal as="li" key={title} delay={i * 80} className="flex flex-col items-center text-center">
                <span className="grid h-[76px] w-[76px] place-items-center rounded-full border-2 border-gold-500 text-cream-100 md:h-[88px] md:w-[88px]">
                  <Icon aria-hidden strokeWidth={1.75} className="h-8 w-8 md:h-9 md:w-9" />
                </span>
                <h3 className="mt-3 font-sans text-[1.05rem] font-extrabold leading-tight text-cream-100">{title}</h3>
                <p className="mt-1 max-w-[16rem] text-[0.95rem] leading-snug text-cream-100/90">{body}</p>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal className="mt-16 md:mt-20">
          <div
            id="find-us"
            tabIndex={-1}
            className="relative rounded-[30px] bg-burgundy-800 p-5 shadow-[var(--shadow-card)] ring-2 ring-choc-950/60 outline-none sm:p-8 lg:p-10"
          >
            <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
              <div>
                <h2 className="font-display text-[clamp(2.1rem,4vw,3rem)] leading-[0.95] text-cream-100">
                  Find us at
                  {" "}<br />
                  <span className="text-gold-300">TERRA UTSAV</span>
                </h2>
                <EventFacts event={event} className="mt-6" />
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  {event.mapUrl ? (
                    <a
                      href={event.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-12 items-center gap-2 rounded-full bg-cream-100 px-5 py-3 font-display text-[1rem] uppercase tracking-[0.02em] text-ink shadow-[0_4px_0_var(--color-cream-300)] transition-transform duration-150 ease-out hover:-translate-y-0.5 active:translate-y-[2px]"
                    >
                      <MapPin aria-hidden className="h-4 w-4" />
                      Get directions
                      <span className="sr-only"> (opens Google Maps in a new tab)</span>
                    </a>
                  ) : (
                    <p className="text-[0.95rem] font-bold text-cream-100/90">Directions will appear here once the stall spot is confirmed.</p>
                  )}
                  {event.instagramUrl && <InstagramLink url={event.instagramUrl} />}
                </div>
              </div>
              <div className="flex flex-col items-center gap-6">
                {/* The stall's real sign: what to look for at the Mandi on the day. */}
                <LogoSign className="w-[min(82%,300px)]" />
                <figure className="relative w-full">
                  <MapArt className="w-full drop-shadow-[0_16px_20px_rgb(10_3_2/0.6)]" />
                  <figcaption className="mt-2 text-center text-[0.95rem] font-semibold text-cream-100/90">
                    A drawing, not a real map: use Get directions.
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
