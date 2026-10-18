"use client";

import { DiyaArt } from "@/components/art/DiyaArt";
import { RangoliArt } from "@/components/art/RangoliArt";
import { cn } from "@/lib/cn";
import { ThreeScene } from "./ThreeScene";

const load = () => import("./scenes/diyas");

/** The drawn rangoli and diyas: the whole picture for visitors without 3D, and the placeholder before it loads. */
function Poster() {
  return (
    <div className="relative h-full w-full">
      <RangoliArt className="absolute inset-[4%] opacity-95" />
      <div className="absolute inset-[24%] rounded-full bg-[radial-gradient(circle,#2a0b10_55%,transparent_72%)]" />
      <div className="absolute inset-x-[14%] top-[42%] flex items-end justify-center gap-[2%]">
        <DiyaArt hue="maroon" delay={250} className="w-[28%]" />
        <DiyaArt hue="terracotta" className="w-[40%] -translate-y-[10%]" />
        <DiyaArt hue="gold" delay={600} className="w-[28%]" />
      </div>
    </div>
  );
}

/** Three clay diyas on a rangoli, in 3D: they light up one by one, and a tap lights or blows one out. */
export function DiyaScene3D({ className }: { className?: string }) {
  return (
    <ThreeScene load={load} interactive poster={<Poster />} className={cn("h-full w-full", className)} label="Three clay diyas lit on a rangoli">
      <p aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[6%] hidden text-center text-[0.95rem] font-bold text-cream-100/90 group-data-[three=live]/three:block">
        Tap a diya to light it or blow it out
      </p>
    </ThreeScene>
  );
}
