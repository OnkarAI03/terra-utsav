import { ArrowRight } from "lucide-react";
import { BrickScene3D } from "@/components/three/BrickScene3D";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function ChallengeTeaser() {
  return (
    <section aria-labelledby="challenge-teaser-title" className="section-pad relative overflow-hidden bg-burgundy-950">
      <div className="shell grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Reveal className="relative order-2 lg:order-1">
          <div className="relative mx-auto aspect-square w-full max-w-[520px]">
            <span
              aria-hidden
              className="text-sticker-gold absolute inset-0 grid place-items-center font-display text-[clamp(11rem,34vw,22rem)] leading-none opacity-95"
            >
              60
            </span>
            <BrickScene3D className="absolute inset-0" />
          </div>
        </Reveal>
        <Reveal delay={90} className="order-1 lg:order-2">
          <h2 id="challenge-teaser-title" className="display-l text-sticker">
            One wet brick.
            {" "}<br />
            Sixty seconds.
          </h2>
          <p className="mt-6 max-w-lg text-[1.15rem] font-semibold leading-relaxed text-cream-100">
            One hand only. Grip it, hold it out, don&apos;t let it slip. A TERRA UTSAV team member times every attempt and
            decides whether it counts.
          </p>
          <div className="mt-8">
            <ButtonLink href="/challenge" size="lg" trailing={<ArrowRight />}>
              Take the challenge
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
