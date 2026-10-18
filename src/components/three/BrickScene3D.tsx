"use client";

import { BrickArt } from "@/components/art/BrickArt";
import { cn } from "@/lib/cn";
import { ThreeScene } from "./ThreeScene";

const load = () => import("./scenes/brick");

/** The challenge brick in 3D, wet and dripping; drag it to turn it. Visitors without 3D see the drawn brick. */
export function BrickScene3D({ className }: { className?: string }) {
  return (
    <ThreeScene
      load={load}
      interactive
      className={cn("h-full w-full", className)}
      label="A wet clay brick with TU pressed into it, dripping water"
      // Sideways drags turn the brick; up and down still scroll the page on a phone.
      canvasClassName="touch-pan-y"
      poster={<BrickArt className="absolute bottom-[4%] left-1/2 w-[72%] -translate-x-1/2 drop-shadow-[0_24px_30px_rgb(0_0_0/0.55)]" />}
    >
      <p aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 hidden text-center text-[0.95rem] font-bold text-cream-100/90 group-data-[three=live]/three:block">
        Drag the brick to turn it
      </p>
    </ThreeScene>
  );
}
