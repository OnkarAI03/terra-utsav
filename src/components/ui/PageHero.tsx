import { FestivalLights } from "@/components/art/FestivalLights";
import { cn } from "@/lib/cn";

/** The opening band of inner pages: festival ground, sticker title, one sentence, optional art. */
export function PageHero({
  title,
  intro,
  art,
  children,
  className,
}: {
  title: React.ReactNode;
  intro?: React.ReactNode;
  art?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("festival-ground relative isolate overflow-hidden", className)}>
      {/* Tall enough on wide screens that the kandils are never cut off; they hang in the side margins, clear of the title and the art. */}
      <FestivalLights
        kandilAt={[70, 1390]}
        className="absolute inset-x-0 top-[calc(var(--header-h)-6px)] -z-10 h-[130px] w-full opacity-90 md:h-[max(190px,16.667vw)]"
      />
      <div className="shell grid items-end gap-8 pb-14 pt-[calc(var(--header-h)+110px)] md:pb-20 md:pt-[calc(var(--header-h)+160px)] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div>
          <h1 className="display-l anim-rise text-sticker">{title}</h1>
          {intro && (
            <p className="anim-rise mt-6 max-w-2xl text-[1.12rem] font-semibold leading-relaxed text-cream-100 md:text-[1.2rem]" style={{ animationDelay: "120ms" }}>
              {intro}
            </p>
          )}
          {children && (
            <div className="anim-rise mt-8" style={{ animationDelay: "200ms" }}>
              {children}
            </div>
          )}
        </div>
        {art && <div className="relative">{art}</div>}
      </div>
    </section>
  );
}
