"use client";

import { useSyncExternalStore } from "react";

/**
 * Mystery eggs: small hidden surprises, purely for fun. They never touch the game, rewards or
 * any data on the server. Progress is remembered in this browser only.
 */
export const EGGS = [
  { id: "diyas", name: "Diya lighter", hint: "Five little flames under the big headline like a bit of attention." },
  { id: "dash", name: "Zoomies", hint: "When the kitten asks if you can catch it, take the dare." },
  { id: "paw", name: "Pat the paw", hint: "The name in the top corner likes being tapped. A lot." },
  { id: "wordmark", name: "Ticklish letters", hint: "The giant name at the very bottom of every page is ticklish." },
] as const;

export type EggId = (typeof EGGS)[number]["id"];
export type Effect = "petals" | "peek" | "dash";

const KEY = "tu-mystery-eggs";
const listeners = new Set<() => void>();
let cache: EggId[] | null = null;

function read(): EggId[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(raw) ? raw.filter((id): id is EggId => EGGS.some((e) => e.id === id)) : [];
  } catch {
    cache = [];
  }
  return cache;
}

const EMPTY: EggId[] = [];

export function useFoundEggs(): EggId[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY,
  );
}

/** Play an effect. Effects are drawn by <EggLayer /> in the root layout. */
export function playEffect(effect: Effect) {
  window.dispatchEvent(new CustomEvent("tu:effect", { detail: effect }));
}

/** Mark an egg as found (once) and celebrate. Returns true the first time. */
export function findEgg(id: EggId, effect: Effect = "petals"): boolean {
  const found = read();
  const isNew = !found.includes(id);
  if (isNew) {
    cache = [...found, id];
    try {
      localStorage.setItem(KEY, JSON.stringify(cache));
    } catch {
      /* private mode: progress lasts for this visit only */
    }
    listeners.forEach((l) => l());
    window.dispatchEvent(new CustomEvent("tu:egg", { detail: { id, count: cache.length, total: EGGS.length } }));
  }
  playEffect(effect);
  return isNew;
}
