"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { WinnerCard } from "@/components/game/WinnerCard";
import { ButtonLink } from "@/components/ui/Button";
import { markLocalPrizeGiven, readLocalPrize, type LocalPrize } from "@/lib/game/prize";

/** My prize when the site has no database: the winner card this phone earned in Catch Mini, if any. */
export function LocalPrizeWallet({ prize, eventDay }: { prize: string | null; eventDay: string | null }) {
  const [local, setLocal] = useState<LocalPrize | null>(null);
  useEffect(() => {
    setLocal(readLocalPrize());
  }, []);

  if (!local) return null;
  if (local.win) {
    return (
      <div className="max-w-xl">
        <p className="text-[1.05rem] font-semibold leading-relaxed">
          {local.win.claimedAt
            ? "You have collected your prize. Thank you for playing!"
            : `Congratulations! Please collect your prize from the TERRA UTSAV team at the stall${eventDay ? ` (${eventDay})` : ""}. Show them this card, live on this phone.`}
        </p>
        <WinnerCard className="mt-6" win={local.win} prize={prize} onGiven={() => setLocal(markLocalPrizeGiven())} />
      </div>
    );
  }
  return (
    <div className="max-w-xl rounded-[var(--radius-panel)] bg-cream-100 p-8">
      <h2 className="display-m text-choc-900">No prize on this phone yet</h2>
      <p className="mt-3 text-[1.05rem] leading-relaxed">
        Clear every level of Catch Mini in a prize attempt and your winner card appears on screen, then here. Collect your prize
        from our team at the stall. One prize per person.
      </p>
      <ButtonLink href="/game" className="mt-6" trailing={<ArrowRight />}>
        Play now
      </ButtonLink>
    </div>
  );
}
