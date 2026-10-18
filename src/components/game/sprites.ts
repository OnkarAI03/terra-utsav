"use client";

import type { DecoyType } from "@/lib/game/engine";

export const SPRITE_SRC = {
  peek: "/images/game/koochu-peek.webp",
  run1: "/images/game/run-1.webp",
  run2: "/images/game/run-2.webp",
  cupcake: "/images/game/decoy-cupcake.webp",
  chilli: "/images/game/decoy-chilli.webp",
  nacho: "/images/game/decoy-nacho.webp",
  chocolate: "/images/game/decoy-chocolate.webp",
} as const;

export type SpriteKey = keyof typeof SPRITE_SRC;
export type Sprites = Partial<Record<SpriteKey, HTMLImageElement>>;

let cache: Promise<Sprites> | null = null;

/** Load every sprite once. Missing images are skipped; the board draws a fallback shape. */
export function loadSprites(): Promise<Sprites> {
  if (cache) return cache;
  cache = Promise.all(
    (Object.keys(SPRITE_SRC) as SpriteKey[]).map(
      (key) =>
        new Promise<[SpriteKey, HTMLImageElement | null]>((resolve) => {
          const img = new Image();
          img.decoding = "async";
          img.onload = () => resolve([key, img]);
          img.onerror = () => resolve([key, null]);
          img.src = SPRITE_SRC[key];
        }),
    ),
  ).then((pairs) => {
    const out: Sprites = {};
    for (const [k, img] of pairs) if (img) out[k] = img;
    return out;
  });
  return cache;
}

export const DECOY_LABEL: Record<DecoyType, string> = {
  cupcake: "cupcake",
  chilli: "chilli",
  nacho: "nacho chip",
  chocolate: "chocolate bar",
};
