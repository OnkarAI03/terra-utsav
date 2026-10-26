import { ArrowRight, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DiyaArt } from "@/components/art/DiyaArt";
import { FestivalLights } from "@/components/art/FestivalLights";
import { InstagramLink } from "@/components/brand/InstagramLink";
import { ButtonLink } from "@/components/ui/Button";
import { PaperNote } from "@/components/ui/PaperNote";
import { Reveal } from "@/components/ui/Reveal";

export function FinalCta({ instagramUrl }: { instagramUrl: string | null }) {
  return (
    <section aria-labelledby="final-cta-title" className="festival-ground relative isolate overflow-hidden pb-20 pt-32 md:pb-28 md:pt-40">
      <FestivalLights className="absolute inset-x-0 top-0 -z-10 h-[150px] w-full md:h-[220px]" />
      <div className="shell grid items-end gap-10 md:grid-cols-[minmax(0,1fr)_auto]">
        <Reveal>
          <h2 id="final-cta-title" className="display-xl text-sticker">
            See you this
            {" "}<br />
            <span className="text-sticker-gold">Diwali.</span>
          </h2>
          <p className="mt-6 max-w-lg text-[1.15rem] font-semibold leading-relaxed text-cream-100">
            Come hungry, bring friends, pick up a diya, and see if anyone in your group can actually catch the kitten.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <ButtonLink href="/#find-us" size="lg" icon={<MapPin />}>
              Find our stall
            </ButtonLink>
            <ButtonLink href="/game" variant="secondary" size="lg" trailing={<ArrowRight />}>
              Play the game
            </ButtonLink>
          </div>
          <p className="mt-6 text-[1.05rem] font-bold text-cream-100">
            Been to the stall?{" "}
            <Link href="/feedback" className="underline decoration-gold-400 decoration-2 underline-offset-4 hover:text-gold-300">
              Rate your visit and take a Diwali selfie
            </Link>
          </p>
          {instagramUrl && (
            <div className="mt-6">
              <InstagramLink url={instagramUrl} />
            </div>
          )}
        </Reveal>
        <Reveal delay={120} className="relative mx-auto w-[240px] md:w-[300px]">
          <Image src="/images/mascot/koochu-idle.webp" alt="" width={762} height={1000} sizes="300px" className="w-full" />
          <DiyaArt className="absolute -bottom-2 -left-10 w-[46%] md:-left-16" delay={200} />
          <PaperNote rotate={6} className="absolute -right-2 top-4 text-[1.2rem] md:-right-10">
            Happy
            {" "}<br />
            Diwali!
          </PaperNote>
        </Reveal>
      </div>
    </section>
  );
}
