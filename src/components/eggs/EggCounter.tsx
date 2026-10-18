"use client";

import { Egg } from "lucide-react";
import { useState } from "react";
import { EGGS, useFoundEggs } from "./store";

/** Footer line: how many mystery eggs this visitor has found, with an optional hint. */
export function EggCounter() {
  const found = useFoundEggs();
  const [hintIndex, setHintIndex] = useState<number | null>(null);
  const remaining = EGGS.filter((e) => !found.includes(e.id));

  const nextHint = () => {
    if (remaining.length === 0) return;
    setHintIndex((i) => (i === null ? 0 : (i + 1) % remaining.length));
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-burgundy-950 px-4 py-3 text-[0.95rem] text-cream-100 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-2 font-bold">
        <Egg aria-hidden className="h-4 w-4 text-gold-400" />
        {found.length === EGGS.length
          ? "You found every mystery egg. Koochu Puchu is impressed."
          : `${EGGS.length} mystery eggs are hidden on this site. Found: ${found.length} of ${EGGS.length}.`}
      </p>
      {remaining.length > 0 && (
        <div className="flex items-center gap-3">
          {hintIndex !== null && (
            <p className="hand text-[1.05rem] text-gold-300" aria-live="polite">
              {remaining[hintIndex % remaining.length]?.hint}
            </p>
          )}
          <button
            type="button"
            onClick={nextHint}
            className="shrink-0 rounded-full border-2 border-cream-100/60 px-3 py-1.5 font-extrabold hover:bg-cream-100 hover:text-ink"
          >
            {hintIndex === null ? "Need a hint?" : "Another hint"}
          </button>
        </div>
      )}
    </div>
  );
}
