"use client";

import { Camera } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

/** The real photograph, or a labelled placeholder when there is none (or it fails to load). */
export function PhotoSide({ name, photoUrl, sizes, priority = false }: { name: string; photoUrl: string | null; sizes: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (photoUrl && !failed) {
    return (
      <div className="absolute inset-0 bg-burgundy-800">
        <Image src={photoUrl} alt={`Photo of ${name}`} fill sizes={sizes} className="object-cover" onError={() => setFailed(true)} priority={priority} />
      </div>
    );
  }
  return (
    <div className="absolute inset-0 grid place-items-center bg-burgundy-800" role="img" aria-label={`Photo of ${name} coming soon`}>
      <svg viewBox="0 0 200 250" className="absolute inset-x-0 bottom-0 h-[78%] w-full text-burgundy-950/70" aria-hidden>
        <circle cx="100" cy="92" r="44" fill="currentColor" />
        <path d="M18 250 C22 176 60 148 100 148 C140 148 178 176 182 250 Z" fill="currentColor" />
      </svg>
      <span className="relative mt-[38%] flex items-center gap-1.5 rounded-full bg-burgundy-950/80 px-3 py-1.5 text-[0.82rem] font-extrabold text-cream-100">
        <Camera aria-hidden className="h-3.5 w-3.5" />
        Photo coming soon
      </span>
    </div>
  );
}
