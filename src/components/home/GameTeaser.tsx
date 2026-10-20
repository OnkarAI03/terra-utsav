import { ArrowRight, Gamepad2 } from "lucide-react";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import type { GameSettings } from "@/lib/game/config";
import { gameFacts } from "@/lib/game/copy";

export function GameTeaser({ settings, prize = null }: { settings: GameSettings; prize?: string | null }) {
  const facts = gameFacts(settings, prize);
  return (
    <section aria-labelledby="game-teaser-title" className="section-pad relative overflow-hidden bg-choc-900">
      <div className="shell grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
        <Reveal>
          <h2 id="game-teaser-title" className="display-l text-sticker">
            Catch
            {" "}<br />
            <span className="text-sticker-gold">Mini.</span>
          </h2>
          <p className="mt-6 max-w-xl text-[1.15rem] font-semibold leading-relaxed text-cream-100">
            {facts.levelsWord[0].toUpperCase() + facts.levelsWord.slice(1)} quick levels, each faster and sneakier than the last.
            Practise as much as you like, then use your {facts.attemptsWord} reward attempts on event day: no sign-up. Clear
            Level {facts.lastLevel} to win {facts.prize}.
          </p>

          <ol className="mt-9 grid gap-2.5 sm:grid-cols-3" aria-label="The levels">
            {settings.levels.map((l) => (
              <li
                key={l.level}
                className="flex items-center gap-3 rounded-2xl bg-burgundy-800 px-3 py-2.5 sm:flex-col sm:items-start sm:gap-1.5 sm:px-3 sm:py-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-400 font-display text-[1.15rem] text-ink">
                  {l.level}
                </span>
                <span className="text-[0.95rem] font-extrabold leading-tight text-cream-100">{l.name}</span>
              </li>
            ))}
          </ol>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <ButtonLink href="/game" size="lg" icon={<Gamepad2 />} trailing={<ArrowRight />}>
              Play now
            </ButtonLink>
            <ButtonLink href="/rules#game" variant="outline" size="lg">
              How it works
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <figure className="relative mx-auto max-w-[520px] overflow-hidden rounded-[var(--radius-panel)] shadow-[var(--shadow-lift)] ring-4 ring-choc-950">
            <div className="relative aspect-[696/1040] w-full">
              <Image
                src="/images/scenes/koochu-paw.webp"
                alt="Mini winking and reaching out with a chocolate-covered paw"
                fill
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="object-cover"
              />
            </div>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
