import { ArrowRight, CalendarDays, Gamepad2, MapPin, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Embers } from "@/components/art/Embers";
import { FestivalLights } from "@/components/art/FestivalLights";
import { TwinkleStars } from "@/components/art/Sparkles";
import { PawIcon } from "@/components/brand/PawIcon";
import { CatchMeNote, HeroDiyas } from "@/components/eggs/Triggers";
import { ButtonLink } from "@/components/ui/Button";
import type { GameSettings } from "@/lib/game/config";
import { gameFacts } from "@/lib/game/copy";
import type { EventSettings } from "@/lib/settings";
import { HeroKandils } from "@/components/three/HeroKandils";
import { HeroArt } from "./HeroArt";
import { Signpost } from "./Signpost";

/**
 * The approved hero with a Diwali twist. Mini bleeds in from the left edge of the window,
 * a marigold toran and kandils hang above, embers drift up from the diyas, and the
 * "Came for the Food. Stayed for the Chaos." lockup lands word by word (CSS keyframes: no script
 * needed, collapses under reduced motion). The date and place are on the first screen.
 */
export function Hero({ event, game, prize = null }: { event: EventSettings; game: GameSettings; prize?: string | null }) {
  const facts = gameFacts(game, prize);
  const venueShort = event.venue?.split(",")[0] ?? null;
  return (
    <section aria-labelledby="hero-title" className="festival-ground relative isolate overflow-hidden">
      <Image src="/images/hero/festival-bokeh.webp" alt="" fill priority sizes="100vw" className="-z-20 object-cover opacity-90" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_70%_40%,transparent_0%,rgb(30_7_9/0.55)_60%,rgb(30_7_9/0.9)_100%)]"
      />
      <TwinkleStars className="absolute inset-x-0 top-[calc(var(--header-h)+40px)] -z-10 h-[260px] w-full md:h-[380px]" />
      <Embers className="absolute inset-0 -z-10" />

      {/* Art: in the flow on phones, bleeding from the left edge on large screens. */}
      <HeroArt />

      {/* The dare sits outside the art panel: the panel's mask makes it its own layer, under the headline's
          grid, which would swallow taps on large screens. Placed as the panel places it: 4% in and below the
          header on small screens; 8% of the panel's width in and 26% down on large ones. */}
      <div className="absolute left-[4%] top-[calc(var(--header-h)+36px)] z-20 lg:left-[calc(min(48vw,920px)*0.08)] lg:top-[26%]">
        <CatchMeNote className="text-[1.1rem] md:text-[1.45rem]">
          Can you
          {" "}<br />
          catch me?
        </CatchMeNote>
      </div>

      {/* Kandils hang behind the toran, so the strings start on the garland. */}
      <HeroKandils />
      <FestivalLights
        lights={false}
        kandils={false}
        className="pointer-events-none absolute inset-x-0 top-[calc(var(--header-h)-6px)] z-[1] h-[130px] w-full md:h-[max(210px,16.667vw)]"
      />

      <div className="shell relative z-10 -mt-24 grid grid-cols-1 items-center gap-6 pb-44 md:-mt-32 md:pb-48 lg:mt-0 lg:min-h-[min(100svh,980px)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-6 lg:pb-56 lg:pt-[calc(var(--header-h)+min(96px,8svh))] xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.1fr)_auto]">
        <div aria-hidden className="hidden lg:block" />

        {/* Phones read (by flex order): headline, when and where, the buttons, then the story. Large screens read in
            source order: headline, the sentence, the buttons, then when and where, so the buttons sit on the first
            screen even on a 768px-tall laptop. */}
        <div className="relative flex flex-col text-center lg:block lg:text-left">
          <h1 id="hero-title" className="order-1 font-display leading-[0.86]">
            <span className="anim-rise text-sticker block text-[clamp(1.6rem,3.4vw,2.5rem)]" style={{ animationDelay: "120ms" }}>
              Came for the
            </span>{" "}
            <span className="anim-land text-sticker-gold block text-[clamp(4.2rem,min(10.5vw,15svh),8rem)]" style={{ animationDelay: "260ms" }}>
              Food.
            </span>{" "}
            <span className="anim-rise text-sticker mt-1 block text-[clamp(1.6rem,3.4vw,2.5rem)]" style={{ animationDelay: "520ms" }}>
              Stayed for the
            </span>{" "}
            <span
              className="anim-land text-sticker-gold inline-flex items-center gap-3 text-[clamp(4.2rem,min(10.5vw,15svh),8rem)]"
              style={{ animationDelay: "660ms" }}
            >
              Chaos.
              <PawIcon className="h-[0.32em] w-[0.32em] text-cream-100" />
            </span>
          </h1>

          <p
            className="anim-rise order-4 mx-auto mt-6 max-w-[34rem] text-[1.08rem] font-semibold leading-relaxed text-cream-100 md:text-[1.18rem] lg:mx-0"
            style={{ animationDelay: "860ms" }}
          >
            This Diwali: Chocolate Bombs, Aalu Ponge, homemade diyas and a 60-second wet-brick challenge. Plus one mischievous kitten
            you probably won&apos;t catch.
          </p>

          <div
            className="anim-rise order-3 mt-7 flex flex-col flex-wrap items-stretch gap-4 sm:flex-row sm:items-center sm:justify-center lg:justify-start"
            style={{ animationDelay: "420ms" }}
          >
            <ButtonLink href="/game" size="lg" icon={<Gamepad2 />} trailing={<ArrowRight />} subline={facts.subline} className="w-full text-balance sm:w-auto">
              Catch Mini
            </ButtonLink>
            <ButtonLink href="/menu" variant="secondary" size="lg" icon={<UtensilsCrossed />} className="w-full text-balance sm:w-auto">
              Explore Menu
            </ButtonLink>
          </div>

          {(event.dateText || event.festivalName || venueShort) && (
            <p
              className="anim-rise order-2 mx-auto mt-5 inline-flex max-w-full flex-col items-start gap-1.5 rounded-[18px] bg-cream-100 px-4 py-3 text-left text-[0.98rem] font-extrabold text-ink shadow-[0_4px_0_var(--color-cream-300)] lg:mx-0"
              style={{ animationDelay: "380ms" }}
            >
              {event.dateText && (
                <span className="inline-flex items-center gap-2">
                  <CalendarDays aria-hidden className="h-4 w-4 shrink-0 text-maroon-600" />
                  {[event.dateText, event.timeText].filter(Boolean).join(", ")}
                </span>
              )}
              {(event.festivalName || venueShort) && (
                <span className="inline-flex items-start gap-2">
                  <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-maroon-600" />
                  {[event.festivalName, venueShort].filter(Boolean).join(", ")}
                </span>
              )}
              {event.mapUrl && (
                <a
                  href={event.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex min-h-11 items-center gap-1.5 font-extrabold text-maroon-600 underline decoration-2 underline-offset-4"
                >
                  Get directions
                  <span className="sr-only"> (opens Google Maps in a new tab)</span>
                </a>
              )}
            </p>
          )}

          <div className="anim-rise order-5 mt-7 flex flex-col items-center gap-3 lg:items-start" style={{ animationDelay: "1040ms" }}>
            <HeroDiyas className="w-full max-w-[300px] justify-center lg:justify-start" />
            <p className="text-[1rem] font-bold text-cream-100">
              Or{" "}
              <Link href="/challenge" className="underline decoration-gold-400 decoration-2 underline-offset-4 hover:text-gold-300">
                take the 60-second brick challenge
              </Link>
            </p>
          </div>
        </div>

        <div className="hidden xl:block">
          <Signpost />
        </div>
      </div>
    </section>
  );
}
