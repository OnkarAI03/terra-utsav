"use client";

import { FestivalLights } from "@/components/art/FestivalLights";
import { ThreeScene } from "./ThreeScene";

const load = () => import("./scenes/kandils");

/** Kandil positions on the toran, in its 1440-wide viewBox. Kept clear of the headline. */
const KANDIL_AT = [60, 300, 1150, 1390];

/**
 * The hero's akash kandils. Large screens get the live 3D lanterns (loaded after the page is idle);
 * phones, reduced motion and data saver keep the drawn ones, which sway in CSS.
 */
export function HeroKandils() {
  return (
    <ThreeScene
      load={load}
      defer
      minWidth={1024}
      className="pointer-events-none absolute inset-x-0 top-[calc(var(--header-h)-6px)] z-[1] h-[130px] md:h-[max(210px,16.667vw)] lg:h-[calc(max(210px,16.667vw)+96px)]"
      poster={<FestivalLights toran={false} lights={false} kandilAt={KANDIL_AT} className="h-[130px] w-full md:h-[max(210px,16.667vw)]" />}
    />
  );
}
