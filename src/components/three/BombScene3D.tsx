"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ThreeScene } from "./ThreeScene";

const load = () => import("./scenes/bomb");

/** The photo stands in for visitors without 3D, and while the scene loads. */
function Poster() {
  return (
    <div className="relative mx-auto h-full w-[78%] overflow-hidden rounded-[28px] shadow-[var(--shadow-lift)]" style={{ rotate: "-3deg" }}>
      {/* The menu page's first big picture, so it loads first. */}
      <Image src="/images/food/chocolate-bomb.webp" alt="" fill priority sizes="(min-width: 1024px) 320px, 70vw" className="object-cover" />
    </div>
  );
}

/**
 * Crack it. Pour it. Devour it. The chocolate bomb in 3D for the menu page: tap it (or the button,
 * which keyboards can reach) to pour hot chocolate on it and watch it open.
 */
export function BombScene3D() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onState = (e: Event) => setOpen((e as CustomEvent<string>).detail === "open");
    window.addEventListener("tu:bomb-state", onState);
    return () => window.removeEventListener("tu:bomb-state", onState);
  }, []);

  return (
    <ThreeScene load={load} interactive poster={<Poster />} className="mx-auto aspect-square w-full max-w-[440px]" label="A chocolate bomb on a plate">
      <p role="status" className="sr-only">
        {open ? "The chocolate bomb is open: hot chocolate poured in and marshmallows popped up." : ""}
      </p>
      <div className="absolute inset-x-0 bottom-2 hidden justify-center group-data-[three=live]/three:flex">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("tu:bomb"))}
          className="rounded-full bg-cream-100 px-5 py-2.5 font-display text-[1rem] uppercase tracking-[0.02em] text-ink shadow-[0_4px_0_var(--color-cream-300)] transition-transform duration-150 ease-out hover:-translate-y-0.5 active:translate-y-[2px]"
        >
          {open ? "Close it up" : "Crack it open"}
        </button>
      </div>
    </ThreeScene>
  );
}
