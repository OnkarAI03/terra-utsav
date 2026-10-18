"use client";

import { RotateCcw, WifiOff } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/** The staff console hit a problem: usually the connection. Nothing was redeemed by this screen. */
export default function StaffError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="grid min-h-[70vh] place-items-center bg-burgundy-950 px-[var(--gutter)] pb-16 pt-[calc(var(--header-h)+40px)] text-center text-cream-100">
      <div className="max-w-md" role="alert">
        <WifiOff aria-hidden className="mx-auto h-10 w-10 text-gold-300" />
        <h1 className="mt-4 font-display text-[2rem] leading-tight">Lost the connection</h1>
        <p className="mt-3 text-[1.05rem] font-semibold">
          Check the Wi-Fi or mobile data, then try again. If you had just pressed Redeem, check the code again before handing anything
          over.
        </p>
        <Button onClick={reset} icon={<RotateCcw />} className="mt-7">
          Try again
        </Button>
      </div>
    </section>
  );
}
