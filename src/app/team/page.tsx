import Image from "next/image";
import { Sparkles } from "lucide-react";
import { DiyaRow } from "@/components/art/DiyaArt";
import { OutfitOverlay, VARIANT_LABEL } from "@/components/team/OutfitOverlay";
import { TeamCard } from "@/components/team/TeamCard";
import { TeamDirectory } from "@/components/team/TeamDirectory";
import { PageHero } from "@/components/ui/PageHero";
import { PaperNote } from "@/components/ui/PaperNote";
import { Reveal } from "@/components/ui/Reveal";
import { getTeam } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { MASCOT_VARIANTS } from "@/lib/types";

export const revalidate = 60;

export const metadata = pageMetadata({
  title: "The People Behind TERRA UTSAV",
  description:
    "Meet the TERRA UTSAV team and mentors. Every card switches between a real photo and that person's own Koochu Puchu, dressed for their role at our Diwali stall.",
  path: "/team",
});

export default async function TeamPage() {
  const team = await getTeam();

  return (
    <>
      <PageHero
        title={
          <>
            The people behind
            {" "}<br />
            <span className="text-sticker-gold">TERRA UTSAV.</span>
          </>
        }
        intro="Every person here has a Koochu Puchu twin dressed for the job they actually do. Watch the cards: the photo turns into the kitten, and back again."
        art={
          <div className="relative mx-auto w-[220px] md:w-[280px]">
            <Image src="/images/mascot/koochu-idle.webp" alt="" width={762} height={1000} sizes="280px" className="w-full" priority />
            <PaperNote rotate={7} className="absolute -right-6 top-6 text-[1.05rem]">
              That&apos;s us!
            </PaperNote>
          </div>
        }
      />

      {team.isPreview && (
        <section aria-labelledby="preview-title" className="bg-gold-300 text-ink">
          <div className="shell flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 id="preview-title" className="title text-choc-900">
                Preview: the line-up is on its way
              </h2>
              <p className="mt-2 text-[1.02rem] leading-relaxed">
                Names, roles and photos are being collected from the team (photos only with each person&apos;s consent). Until then,
                each card below is a labelled placeholder showing how the photo-to-mascot switch works.
              </p>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="mentors-title" className="section-pad bg-burgundy-950">
        <div className="shell">
          <Reveal className="max-w-2xl">
            <h2 id="mentors-title" className="display-l text-sticker">
              Our mentors
            </h2>
            <p className="mt-4 text-[1.1rem] font-semibold leading-relaxed text-cream-100">
              The people who said yes to a kitten, a wet brick and a counter full of chocolate.
            </p>
          </Reveal>
          {team.mentors.length > 0 ? (
            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {team.mentors.map((m, i) => (
                <Reveal as="li" key={m.id} delay={i * 80}>
                  <TeamCard member={m} variant="mentor" index={i} />
                </Reveal>
              ))}
            </ul>
          ) : (
            <p className="mt-8 text-[1.05rem] text-cream-100">Mentor profiles will appear here soon.</p>
          )}
        </div>
      </section>

      <section aria-labelledby="team-title" className="section-pad bg-cream-200 text-ink">
        <div className="shell">
          <Reveal className="mb-12 max-w-2xl">
            <h2 id="team-title" className="display-l text-choc-900">
              The crew
            </h2>
            <p className="mt-4 text-[1.1rem] font-semibold leading-relaxed">
              Cooks, builders, organisers and the people who keep the queue happy. Tap the switch on any card to flip it yourself.
            </p>
          </Reveal>
          {team.students.length > 0 ? (
            <TeamDirectory groups={team.groups} students={team.students} />
          ) : (
            <p className="text-[1.05rem]">Team profiles will appear here soon.</p>
          )}
        </div>
      </section>

      {team.isPreview && (
        <section aria-labelledby="wardrobe-title" className="section-pad bg-choc-900">
          <div className="shell">
            <Reveal className="max-w-2xl">
              <h2 id="wardrobe-title" className="display-m text-sticker">
                One kitten, many jobs
              </h2>
              <p className="mt-4 text-[1.08rem] leading-relaxed text-cream-100">
                The outfits available for team cards. Each person gets the one that matches their real role once the line-up is in.
              </p>
            </Reveal>
            <ul className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
              {MASCOT_VARIANTS.map((v, i) => (
                <Reveal as="li" key={v} delay={i * 50} className="flex flex-col items-center gap-2 text-center">
                  <div className="relative aspect-square w-full overflow-hidden rounded-[18px] bg-[#f6e4cc]">
                    <Image src="/images/mascot/koochu-idle-cream.webp" alt="" fill sizes="(min-width: 1024px) 11vw, 30vw" className="object-cover object-[50%_35%]" />
                    <OutfitOverlay variant={v} className="absolute inset-0 h-full w-full" />
                  </div>
                  <span className="text-[0.88rem] font-extrabold text-cream-100">{VARIANT_LABEL[v]}</span>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section aria-labelledby="thanks-title" className="festival-ground relative overflow-hidden py-20 md:py-28">
        <div className="shell flex flex-col items-center text-center">
          <Sparkles aria-hidden className="h-9 w-9 text-gold-400" />
          <h2 id="thanks-title" className="display-l text-sticker mt-4">
            Made by this lot.
          </h2>
          <p className="mt-5 max-w-xl text-[1.12rem] font-semibold leading-relaxed text-cream-100">
            Every Chocolate Bomb, every diya, every brick and every level of the game. Thank you, team. Happy Diwali.
          </p>
          <DiyaRow count={7} className="mt-10 w-full max-w-xl" />
        </div>
      </section>
    </>
  );
}
