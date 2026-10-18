"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Logged for the server logs; no details are shown to visitors.
    console.error(error);
  }, [error]);

  return (
    <section className="festival-ground grid min-h-[80vh] place-items-center px-[var(--gutter)] pb-16 pt-[calc(var(--header-h)+48px)] text-center">
      <div className="max-w-xl" role="alert">
        <h1 className="display-l text-sticker">Something spilled.</h1>
        <p className="mt-4 text-[1.1rem] font-semibold text-cream-100">That page hit a problem on our side. Try again, or head back to the stall.</p>
        {error.digest && <p className="mt-2 text-[0.9rem] text-cream-100/80">Reference: {error.digest}</p>}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button onClick={reset} icon={<RotateCcw />}>
            Try again
          </Button>
          <ButtonLink href="/" variant="secondary">
            Back to the stall
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
