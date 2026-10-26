import { Reveal } from "@/components/ui/Reveal";

const PARTS = [
  {
    word: "Terra",
    script: null,
    origin: "Latin",
    meaning: "earth, land",
    body: "The root of terrain, territory and terracotta, the “baked earth” that clay diyas are made of.",
  },
  {
    word: "Utsav",
    script: "उत्सव",
    origin: "Sanskrit",
    meaning: "festival, celebration",
    body: "The word for a festival or a joyful celebration, and Diwali is the brightest of them all.",
  },
];

/** Where the stall's name comes from: Terra (earth) + Utsav (festival). */
export function NameStory() {
  return (
    <section aria-labelledby="name-story-title" className="relative bg-choc-900 pb-6 pt-20 md:pt-28">
      <div className="shell">
        <Reveal>
          <p className="text-[0.95rem] font-extrabold uppercase tracking-[0.14em] text-gold-300">What&apos;s in a name?</p>
          <h2 id="name-story-title" className="display-l mt-3 max-w-3xl text-cream-100">
            TERRA UTSAV means a <span className="text-gold-300">festival of the earth.</span>
          </h2>
        </Reveal>
        <div className="mt-10 grid items-stretch gap-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-6">
          {PARTS.map((part, i) => (
            <Reveal key={part.word} delay={i * 120} className={i === 1 ? "md:col-start-3" : undefined}>
              <article className="h-full rounded-[var(--radius-panel)] bg-cream-100 p-7 text-ink md:p-8">
                <p className="text-[0.9rem] font-extrabold uppercase tracking-[0.12em] text-maroon-600">
                  {part.origin} · {part.meaning}
                </p>
                <p className="mt-2 flex flex-wrap items-baseline gap-x-3 font-display text-[3.2rem] leading-none text-choc-900 md:text-[4rem]">
                  {part.word}
                  {part.script && (
                    <span lang="sa" className="text-[2rem] text-maroon-600 md:text-[2.4rem]">
                      {part.script}
                    </span>
                  )}
                </p>
                <p className="mt-4 text-[1.05rem] leading-relaxed">{part.body}</p>
              </article>
            </Reveal>
          ))}
          <p aria-hidden className="row-start-2 self-center text-center font-display text-[2.6rem] leading-none text-gold-300 md:col-start-2 md:row-start-1">
            +
          </p>
        </div>
        <Reveal delay={240}>
          <p className="mt-8 max-w-2xl text-[1.15rem] font-semibold leading-relaxed text-cream-100">
            A good name for a stall at the Eco-friendly Diwali Mandi: a Diwali celebration that starts from the earth up.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
