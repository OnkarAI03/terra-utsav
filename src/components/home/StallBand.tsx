import { CakeSlice, Flame, Gamepad2, MapPin, Ticket } from "lucide-react";
import Image from "next/image";
import { MapArt } from "@/components/art/MapArt";
import { InstagramLink } from "@/components/brand/InstagramLink";
import { PaperNote } from "@/components/ui/PaperNote";
import { Reveal } from "@/components/ui/Reveal";
import type { EventSettings } from "@/lib/settings";
import { EventFacts } from "./EventFacts";

const REASONS = [
  { icon: CakeSlice, title: "Delicious Food", body: "Chocolate Bombs and Chat Papdi at the counter." },
  { icon: Flame, title: "Homemade Diyas", body: "Take a little Diwali light home with you." },
  { icon: Gamepad2, title: "Fun Challenges", body: "Hold one wet brick in one hand for sixty seconds." },
  { icon: Ticket, title: "Exciting Coupons", body: "Clear all five levels of the game to win one." },
];

/** "What's happening at our stall?" with the Find Us card, from the approved design. */
export function StallBand({ event }: { event: EventSettings }) {
  return (
    <section aria-labelledby="happening-title" className="relative overflow-hidden bg-choc-900 pb-20 pt-20 md:pt-28">
      <div className="shell grid items-center gap-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-10">
        <div className="relative">
          <div className="flex flex-col items-start gap-8 md:flex-row md:items-end">
            <div className="relative -ml-2 flex items-end">
              <Image
                src="/images/game/koochu-peek.webp"
                alt=""
                width={520}
                height={474}
                sizes="180px"
                className="w-[150px] md:w-[180px]"
              />
              <PaperNote as="h2" rotate={-5} className="relative -ml-6 mb-6 text-[1.5rem] md:text-[1.85rem]">
                <span id="happening-title">
                  What&apos;s happening
                  {" "}<br />
                  at our stall?
                </span>
              </PaperNote>
            </div>
          </div>

          <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-4">
            {REASONS.map(({ icon: Icon, title, body }, i) => (
              <Reveal as="li" key={title} delay={i * 80} className="flex flex-col items-center text-center">
                <span className="grid h-[76px] w-[76px] place-items-center rounded-full border-2 border-gold-500 text-cream-100 transition-transform duration-300 ease-out hover:scale-105 md:h-[88px] md:w-[88px]">
                  <Icon aria-hidden strokeWidth={1.75} className="h-8 w-8 md:h-9 md:w-9" />
                </span>
                <h3 className="mt-3 font-sans text-[1.05rem] font-extrabold leading-tight text-cream-100">{title}</h3>
                <p className="mt-1 max-w-[16rem] text-[0.95rem] leading-snug text-cream-100/90">{body}</p>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal>
          <div id="find-us" className="relative scroll-mt-28 rounded-[30px] bg-burgundy-800 p-5 shadow-[var(--shadow-card)] ring-2 ring-choc-950/60 md:p-6">
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-center">
              <div>
                <h2 className="font-display text-[2.1rem] leading-[0.95] text-cream-100">
                  Find us at
                  {" "}<br />
                  <span className="text-gold-300">TERRA UTSAV</span>
                </h2>
                <EventFacts event={event} className="mt-4" />
                {event.mapUrl ? (
                  <a
                    href={event.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-cream-100 px-5 py-3 font-display text-[1rem] uppercase text-ink shadow-[0_4px_0_var(--color-cream-300)] transition-transform duration-150 hover:-translate-y-0.5"
                  >
                    <MapPin aria-hidden className="h-4 w-4" />
                    Get directions
                  </a>
                ) : (
                  <p className="mt-5 text-[0.95rem] font-bold text-cream-100/90">Directions will appear here once the stall spot is confirmed.</p>
                )}
                {event.instagramUrl && (
                  <div className="mt-4">
                    <InstagramLink url={event.instagramUrl} />
                  </div>
                )}
              </div>
              <figure className="relative">
                <MapArt className="w-full drop-shadow-[0_16px_20px_rgb(10_3_2/0.6)]" />
                <figcaption className="mt-2 text-center text-[0.8125rem] font-semibold text-cream-100/80">
                  Illustration. Use Get directions for the real map.
                </figcaption>
              </figure>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
