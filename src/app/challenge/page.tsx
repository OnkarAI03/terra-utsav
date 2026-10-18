import { Hand, ShieldCheck, TriangleAlert, Users } from "lucide-react";
import { BrickScene3D } from "@/components/three/BrickScene3D";
import { SpectatorTimer } from "@/components/challenge/SpectatorTimer";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { CHALLENGE } from "@/content/challenge";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Hold the Wet Brick: 60-Second Challenge",
  description:
    "The TERRA UTSAV physical challenge: hold one wet brick in a single hand for 60 seconds. Supervised and timed by our staff at the stall.",
  path: "/challenge",
});

export default function ChallengePage() {
  return (
    <>
      <PageHero
        title={
          <>
            Hold the
            {" "}<br />
            <span className="text-sticker-gold">Wet Brick.</span>
          </>
        }
        intro="One wet brick, in one hand, for sixty seconds. It sounds easy until the clay starts to slip."
        art={
          <div className="relative mx-auto aspect-square w-full max-w-[440px]">
            <span aria-hidden className="text-sticker-gold absolute right-0 top-[4%] font-display text-[7rem] leading-none md:text-[9rem]">
              60s
            </span>
            <BrickScene3D className="absolute inset-0" />
          </div>
        }
      />

      <section aria-labelledby="how-title" className="section-pad bg-cream-200 text-ink">
        <div className="shell grid gap-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Reveal>
            <h2 id="how-title" className="display-m text-choc-900">
              How it works
            </h2>
            <ol className="mt-8 flex flex-col gap-5">
              {CHALLENGE.steps.map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-maroon-600 font-display text-[1.2rem] text-cream-100">
                    {i + 1}
                  </span>
                  <p className="pt-1.5 text-[1.08rem] leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal delay={100}>
            <div className="rounded-[var(--radius-panel)] bg-choc-900 p-7 text-cream-100 shadow-[var(--shadow-card)] md:p-9">
              <ShieldCheck aria-hidden className="h-9 w-9 text-gold-400" />
              <h2 className="title mt-4 text-cream-100">Only our staff can confirm a result</h2>
              <p className="mt-3 text-[1.05rem] leading-relaxed">
                This website cannot see, weigh or time your brick, and it does not record challenge results. A TERRA UTSAV
                team member supervises, keeps the official time and decides whether the attempt counts.
              </p>
              <p className="mt-3 text-[1.05rem] leading-relaxed">Any prize for the challenge is announced at the stall.</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="safety-title" className="section-pad bg-burgundy-900">
        <div className="shell">
          {!CHALLENGE.rulesApproved && (
            <Reveal>
              <p className="mb-8 inline-flex items-center gap-2 rounded-full bg-gold-400 px-4 py-2 text-[0.95rem] font-extrabold text-ink">
                <TriangleAlert aria-hidden className="h-4 w-4" />
                Draft rules: waiting for organiser approval
              </p>
            </Reveal>
          )}
          <div className="grid gap-12 md:grid-cols-2">
            <Reveal>
              <div className="flex items-center gap-3">
                <Hand aria-hidden className="h-8 w-8 text-gold-400" />
                <h2 id="safety-title" className="display-m text-cream-100">
                  Safety first
                </h2>
              </div>
              <ul className="mt-6 flex flex-col gap-4">
                {CHALLENGE.safety.map((rule) => (
                  <li key={rule} className="flex gap-3 text-[1.05rem] leading-relaxed text-cream-100">
                    <span aria-hidden className="mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gold-400" />
                    {rule}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={100}>
              <div className="flex items-center gap-3">
                <Users aria-hidden className="h-8 w-8 text-gold-400" />
                <h2 className="display-m text-cream-100">Who can play</h2>
              </div>
              <ul className="mt-6 flex flex-col gap-4">
                {CHALLENGE.eligibility.map((rule) => (
                  <li key={rule} className="flex gap-3 text-[1.05rem] leading-relaxed text-cream-100">
                    <span aria-hidden className="mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gold-400" />
                    {rule}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      <section aria-labelledby="timer-title" className="section-pad bg-choc-900">
        <div className="shell grid items-center gap-10 md:grid-cols-2">
          <Reveal>
            <h2 id="timer-title" className="display-m text-sticker">
              Cheer them on
            </h2>
            <p className="mt-5 max-w-md text-[1.08rem] leading-relaxed text-cream-100">
              Watching a friend try? Run this countdown on your phone for fun. It is not the official timer and it records
              nothing; our team member&apos;s time is the one that counts.
            </p>
          </Reveal>
          <Reveal delay={100} className="flex justify-center">
            <SpectatorTimer seconds={CHALLENGE.durationSeconds} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
