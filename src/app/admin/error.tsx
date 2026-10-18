"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/** An admin page hit a problem. Saved settings are safe; only an unsaved form is lost. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="grid min-h-[60vh] place-items-center px-[var(--gutter)] pb-16 pt-[calc(var(--header-h)+40px)] text-center text-cream-100">
      <div className="max-w-md" role="alert">
        <h1 className="font-display text-[2rem] leading-tight">That didn&apos;t save</h1>
        <p className="mt-3 text-[1.05rem] font-semibold">
          Something went wrong, often the connection or a very large photo. What was already saved is safe. Try again.
        </p>
        {error.digest && <p className="mt-2 text-[0.9rem] text-cream-100/80">Reference: {error.digest}</p>}
        <Button onClick={reset} icon={<RotateCcw />} className="mt-7">
          Try again
        </Button>
      </div>
    </section>
  );
}
