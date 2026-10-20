import Image from "next/image";
import { Sparkles } from "lucide-react";
import { DiyaRow } from "@/components/art/DiyaArt";
import { OutfitOverlay, VARIANT_LABEL } from "@/components/team/OutfitOverlay";
import { TeamDirectory } from "@/components/team/TeamDirectory";
import { PageHero } from "@/components/ui/PageHero";
import { PaperNote } from "@/components/ui/PaperNote";
import { Reveal } from "@/components/ui/Reveal";
import { getEventSettings, getTeam } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Meet the Team",
    description:
      "Meet the TERRA UTSAV team and mentors. Every card switches between a real photo and that person's own Mini, dressed for their role at our Diwali stall.",
    path: "/team",
  }),
  // Students' faces stay off search engines and image search.
  robots: { index: false, follow: true, googleBot: { index: false, follow: true, noimageindex: true } },
};

export default async function TeamPage() {
  const [team, event] = await Promise.all([getTeam(), getEventSettings()]);
  const count = team.students.length;
  const mentors = team.mentorsArePreview ? [] : team.mentors;
  const handle = event.instagramUrl?.match(/instagram\.com\/([^/?#]+)/i)?.[1];

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
        intro={`${count} students, ${team.groups.length || "a few"} teams${mentors.length ? `, ${mentors.length} mentors` : ""} and one kitten with a different outfit for every job. Watch the cards: each photo turns into that person's Mini, and back again.`}
        art={
          <div className="relative mx-auto w-[220px] md:w-[280px]">
            <Image src="/images/mascot/koochu-idle.webp" alt="" width={762} height={1000} sizes="280px" className="w-full" priority />
            <PaperNote rotate={7} className="absolute -right-6 top-6 text-[1.05rem]">
              That&apos;s us!
            </PaperNote>
          </div>
        }
      />

      <section aria-labelledby="team-title" className="section-pad bg-cream-200 text-ink">
        <div className="shell">
          <Reveal className="mb-10 max-w-2xl">
            <h2 id="team-title" className="display-l text-choc-900">
              The crew
            </h2>
            <p className="mt-4 text-[1.1rem] font-semibold leading-relaxed">
              Grouped by what they actually do at the stall. Hover or focus a card to hold it still, tap its switch to flip it, or pause them all.
            </p>
          </Reveal>
          {team.students.length > 0 ? (
            <TeamDirectory groups={team.groups} students={team.students} />
          ) : (
            <p className="text-[1.05rem]">Team profiles will appear here soon.</p>
          )}

          {mentors.length > 0 && (
            <section aria-labelledby="mentors-title" className="mt-16 border-t-2 border-choc-900/15 pt-10">
              <h3 id="mentors-title" className="display-m text-choc-900">
                Our mentors
              </h3>
              <ul className="mt-6 flex flex-wrap gap-x-10 gap-y-6">
                {mentors.map((m) => (
                  <li key={m.id} className="flex items-center gap-4">
                    {m.photoUrl ? (
                      <Image
                        src={m.photoUrl}
                        alt={`Photo of ${m.name}`}
                        width={96}
                        height={96}
                        sizes="88px"
                        className="h-[88px] w-[88px] rounded-[20px] object-cover shadow-[var(--shadow-card)] ring-2 ring-gold-500"
                      />
                    ) : (
                      <span aria-hidden className="grid h-[88px] w-[88px] place-items-center rounded-[20px] bg-cream-100 font-display text-[2rem] text-maroon-600">
                        {m.name.slice(0, 1)}
                      </span>
                    )}
                    <span className="flex flex-col">
                      <span className="font-display text-[1.45rem] leading-tight text-choc-900">{m.name}</span>
                      <span className="text-[0.98rem] font-bold text-maroon-600">{m.title}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-14 max-w-2xl text-[0.98rem] font-semibold leading-relaxed text-ink-soft">
            Want your photo changed or removed?{" "}
            {event.contactEmail ? (
              <a href={`mailto:${event.contactEmail}`} className="font-extrabold text-maroon-600 underline underline-offset-4">
                Email {event.contactEmail}
              </a>
            ) : event.instagramUrl ? (
              <a href={event.instagramUrl} target="_blank" rel="noopener noreferrer" className="font-extrabold text-maroon-600 underline underline-offset-4">
                Message us on Instagram{handle ? ` (@${handle})` : ""}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              "Tell any of us at the stall."
            )}{" "}
            We take it down straight away.
          </p>
        </div>
      </section>

      {team.groups.length > 0 && (
        <section aria-labelledby="wardrobe-title" className="section-pad bg-choc-900">
          <div className="shell">
            <Reveal className="max-w-2xl">
              <h2 id="wardrobe-title" className="display-m text-sticker">
                Spot the job by the outfit
              </h2>
              <p className="mt-4 text-[1.08rem] leading-relaxed text-cream-100">
                Same kitten, same headband, different uniform for every team.
              </p>
            </Reveal>
            <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
              {team.groups.map((g, i) => (
                <Reveal as="li" key={g.id} delay={i * 50} className="flex flex-col items-center gap-2 text-center">
                  <div className="relative aspect-square w-full overflow-hidden rounded-[18px] bg-[#f6e4cc]">
                    <Image src="/images/mascot/koochu-idle-cream.webp" alt="" fill sizes="(min-width: 1024px) 13vw, 45vw" className="object-cover object-[50%_35%]" />
                    <OutfitOverlay variant={g.mascotVariant} className="absolute inset-0 h-full w-full" />
                  </div>
                  <span className="text-[0.95rem] font-extrabold leading-tight text-cream-100">{g.name}</span>
                  <span className="sr-only">Outfit: {VARIANT_LABEL[g.mascotVariant]}</span>
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
