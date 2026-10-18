"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { recordChallenge, type ChallengeState } from "@/app/staff/actions";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Outcome = "completed" | "stopped" | "rules";

/**
 * Staff-only record of a wet-brick attempt. The website never decides this; staff do. The
 * attempt is 60 seconds, so seconds are capped at 60, and "completed" means exactly that.
 * A failed save keeps what was typed.
 */
export function ChallengeRecorder() {
  const [state, setState] = useState<ChallengeState>(null);
  const [outcome, setOutcome] = useState<Outcome>("completed");
  const [pending, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (outcome === "completed") fd.set("seconds", "60");
        if (outcome === "completed") fd.set("completed", "on");
        else fd.delete("completed");
        startTransition(async () => {
          try {
            const r = await recordChallenge(null, fd);
            setState(r);
            if (r?.ok) {
              form.current?.reset();
              setOutcome("completed");
            }
          } catch {
            setState({ ok: false, message: "No connection. Nothing was saved; try again." });
          }
        });
      }}
      className="rounded-[var(--radius-card)] bg-cream-100 p-6 text-ink"
    >
      <h2 id="brick" className="title scroll-mt-28 text-choc-900">
        Record a brick challenge
      </h2>
      <p className="mt-2 text-[0.98rem]">Optional. Only for attempts you timed yourself.</p>
      <label className="mt-5 flex flex-col gap-2 text-[0.98rem] font-extrabold">
        Nickname (optional)
        <input name="participant" maxLength={40} autoComplete="off" className="rounded-2xl border-2 border-choc-900/40 bg-cream-50 px-4 py-3 font-semibold outline-none focus:border-maroon-600" />
      </label>
      <fieldset className="mt-5">
        <legend className="text-[0.98rem] font-extrabold">Result</legend>
        <div className="mt-2 flex flex-col gap-2">
          {(
            [
              ["completed", "Held the full 60 seconds, rules kept"],
              ["stopped", "Stopped early"],
              ["rules", "Broke the rules"],
            ] as [Outcome, string][]
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-3 text-[1rem] font-bold">
              <input
                type="radio"
                name="outcome"
                value={value}
                checked={outcome === value}
                onChange={() => setOutcome(value)}
                className="h-5 w-5 accent-[var(--color-maroon-600)]"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {outcome !== "completed" && (
        <label className="mt-4 flex max-w-[14rem] flex-col gap-2 text-[0.98rem] font-extrabold">
          {outcome === "stopped" ? "Stopped at (seconds)" : "Rules broken at (seconds)"}
          <input
            name="seconds"
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            required
            className="rounded-2xl border-2 border-choc-900/40 bg-cream-50 px-4 py-3 font-semibold outline-none focus:border-maroon-600"
          />
        </label>
      )}
      <Button type="submit" className="mt-5" disabled={pending}>
        {pending ? "Saving…" : "Save result"}
      </Button>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={cn("mt-3 flex items-start gap-2 font-bold", state.ok ? "text-success-ink" : "text-danger-ink")}>
          {state.ok ? <CircleCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /> : <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />}
          {state.message}
        </p>
      )}
    </form>
  );
}
