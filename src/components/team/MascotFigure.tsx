"use client";

import Image from "next/image";
import { useState } from "react";
import type { MascotVariant } from "@/lib/types";
import { OutfitOverlay, VARIANT_LABEL } from "./OutfitOverlay";

const BASE = "/images/mascot/koochu-idle-cream.webp";

/**
 * A team member's Koochu Puchu. Uses their personalised render when one exists, otherwise the
 * locked base render dressed in the outfit for their role. Falls back to the base render if the
 * personalised image fails to load, so a broken image is never shown.
 */
export function MascotFigure({
  name,
  variant,
  mascotUrl,
  sizes,
  priority = false,
}: {
  name: string;
  variant: MascotVariant;
  mascotUrl: string | null;
  sizes: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const custom = mascotUrl && !failed;
  const alt = `Illustration: ${name} as Koochu Puchu, dressed for ${VARIANT_LABEL[variant].toLowerCase()}`;

  return (
    <div className="absolute inset-0 bg-[#f6e4cc]">
      {custom ? (
        <Image src={mascotUrl} alt={alt} fill sizes={sizes} className="object-cover" onError={() => setFailed(true)} priority={priority} />
      ) : (
        <>
          <Image src={BASE} alt={alt} fill sizes={sizes} className="object-cover object-[50%_35%]" priority={priority} />
          <OutfitOverlay variant={variant} className="absolute inset-0 h-full w-full object-cover" />
        </>
      )}
    </div>
  );
}
