import { ArrowDown, ArrowRight, CalendarDays, Gamepad2, MapPin, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DiyaRow } from "@/components/art/DiyaArt";
import { FestivalLights } from "@/components/art/FestivalLights";
import { TwinkleStars } from "@/components/art/Sparkles";
import { PawIcon } from "@/components/brand/PawIcon";
import { ButtonLink } from "@/components/ui/Button";
import { PaperNote } from "@/components/ui/PaperNote";
import type { EventSettings } from "@/lib/settings";
import { HeroKitten } from "./HeroKitten";
import { Signpost } from "./Signpost";

/**
 * The approved hero with a Diwali twist: Koochu Puchu leaping in from the left under a marigold
 * toran and kandils, the "Came for the Food. Stayed for the Chaos." lockup, two actions, a row of
 * lit diyas, and the wooden signpost. The headline lands word by word with CSS keyframes (they
 * run without JavaScript and collapse under reduced motion).
 */
export function Hero({ event }: { event: EventSettings }) {
  const venueShort = event.venue?.split(",")[0] ?? null;
  return (
    <section aria-labelledby="hero-title" className="festival-ground relative isolate overflow-hidden">
      <Image src="/images/hero/festival-bokeh.webp" alt="" fill priority sizes="100vw" className="-z-20 object-cover opacity-90" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_70%_40%,transparent_0%,rgb(30_7_9/0.55)_60%,rgb(30_7_9/0.9)_100%)]"
      />
      <TwinkleStars className="absolute inset-x-0 top-[calc(var(--header-h)+40px)] -z-10 h-[260px] w-full md:h-[380px]" />
      <FestivalLights
        lights={false}
        kandilAt={[60, 300, 1150, 1390]}
        className="absolute inset-x-0 top-[calc(var(--header-h)-6px)] -z-10 h-[130px] w-full md:h-[210px]"
      />

      <div className="shell relative grid min-h-[min(100svh,1000px)] grid-cols-1 items-center gap-6 pb-40 pt-[calc(var(--header-h)+84px)] md:pb-48 md:pt-[calc(var(--header-h)+120px)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-6 lg:pb-56 lg:pt-[calc(var(--header-h)+96px)] xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.1fr)_auto]">
        <HeroKitten>
          <div className="relative aspect-[660/790] w-full [mask-image:radial-gradient(92%_86%_at_48%_44%,#000_64%,transparent_100%)]">
            <Image
              src="/images/scenes/koochu-chocolate-bomb.webp"
              alt="Koochu Puchu, a calico kitten in a festive headband, winking with a chocolate-covered paw over a cracked chocolate bomb"
              fill
              priority
              sizes="(min-width: 1280px) 34vw, (min-width: 1024px) 40vw, 78vw"
              className="object-cover"
            />
          </div>
          <div className="absolute -left-3 top-[4%] hidden sm:block lg:-left-8">
            <PaperNote rotate={-8} className="text-[1.15rem] md:text-[1.45rem]">
              Can you
              {" "}<br />
              catch me?
            </PaperNote>
          </div>
        </HeroKitten>

        <div className="relative z-10 text-center lg:text-left">
          <h1 id="hero-title" className="font-display leading-[0.86]">
            <span className="anim-rise text-sticker block text-[clamp(1.6rem,3.4vw,2.5rem)]" style={{ animationDelay: "120ms" }}>
              Came for the
            </span>{" "}
            <span className="anim-land text-sticker-gold block text-[clamp(4.2rem,10.5vw,8rem)]" style={{ animationDelay: "260ms" }}>
              Food.
            </span>{" "}
            <span className="anim-rise text-sticker mt-1 block text-[clamp(1.6rem,3.4vw,2.5rem)]" style={{ animationDelay: "520ms" }}>
              Stayed for the
            </span>{" "}
            <span
              className="anim-land text-sticker-gold inline-flex items-center gap-3 text-[clamp(4.2rem,10.5vw,8rem)]"
              style={{ animationDelay: "660ms" }}
            >
              Chaos.
              <PawIcon className="h-[0.32em] w-[0.32em] text-cream-100" />
            </span>
          </h1>

          <p
            className="anim-rise mx-auto mt-6 max-w-[34rem] text-[1.08rem] font-semibold leading-relaxed text-cream-100 md:text-[1.18rem] lg:mx-0"
            style={{ animationDelay: "860ms" }}
          >
            This Diwali: Chocolate Bombs, Chat Papdi, homemade diyas and a 60-second wet-brick challenge. Plus one
            mischievous kitten you probably won&apos;t catch.
          </p>

          {(event.dateText || event.festivalName || venueShort) && (
            <p
              className="anim-rise mx-auto mt-5 inline-flex max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-[18px] bg-cream-100 px-4 py-2.5 text-[0.98rem] font-extrabold text-ink shadow-[0_4px_0_var(--color-cream-300)] lg:mx-0 lg:justify-start"
              style={{ animationDelay: "900ms" }}
            >
              {event.dateText && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays aria-hidden className="h-4 w-4 text-maroon-600" />
                  {[event.dateText, event.timeText].filter(Boolean).join(", ")}
                </span>
              )}
              {(event.festivalName || venueShort) && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin aria-hidden className="h-4 w-4 text-maroon-600" />
                  {[event.festivalName, venueShort].filter(Boolean).join(", ")}
                </span>
              )}
            </p>
          )}

          <div
            className="anim-rise mt-8 flex flex-col flex-wrap items-stretch gap-4 sm:flex-row sm:items-center sm:justify-center lg:justify-start"
            style={{ animationDelay: "960ms" }}
          >
            <ButtonLink
              href="/game"
              size="lg"
              icon={<Gamepad2 />}
              trailing={<ArrowRight />}
              subline="5 levels · 2 attempts · win a coupon"
              className="whitespace-nowrap"
            >
              Catch Koochu Puchu
            </ButtonLink>
            <ButtonLink href="/menu" variant="secondary" size="lg" icon={<UtensilsCrossed />} className="whitespace-nowrap">
              Explore Menu
            </ButtonLink>
          </div>

          <DiyaRow count={5} className="anim-rise mx-auto mt-7 w-full max-w-[300px] lg:mx-0 lg:justify-start" />

          <p className="anim-rise mt-4 text-[1rem] font-bold text-cream-100" style={{ animationDelay: "1040ms" }}>
            Or{" "}
            <Link href="/challenge" className="underline decoration-gold-400 decoration-2 underline-offset-4 hover:text-gold-300">
              take the 60-second brick challenge
            </Link>
          </p>
        </div>

        <div className="hidden xl:block">
          <Signpost />
        </div>

        <a
          href="#attractions"
          className="absolute bottom-28 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 text-[0.8125rem] font-extrabold uppercase tracking-[0.12em] text-cream-100/90 md:flex lg:hidden"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-cream-100/70">
            <ArrowDown aria-hidden className="h-4 w-4" />
          </span>
          Scroll to explore
        </a>
      </div>
    </section>
  );
}
