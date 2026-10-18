"use client";

import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { useLogoTaps } from "@/components/eggs/Triggers";

/** The header wordmark. It goes home, and it counts quick taps for a mystery egg. */
export function LogoLink() {
  const tap = useLogoTaps();
  return (
    <Link href="/" aria-label="TERRA UTSAV home" onClick={tap} className="relative z-[60] shrink-0 rounded-lg">
      <Wordmark size="md" />
    </Link>
  );
}
