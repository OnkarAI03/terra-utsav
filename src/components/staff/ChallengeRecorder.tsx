"use client";

import { useActionState } from "react";
import { recordChallenge, type ChallengeState } from "@/app/staff/actions";
import { Button } from "@/components/ui/Button";

/** Staff-only record of a wet-brick attempt. The website never decides this; staff do. */
export function ChallengeRecorder() {
  const [state, action, pending] = useActionState<ChallengeState, FormData>(recordChallenge, null);
  return (
    <form action={action} className="rounded-[var(--radius-card)] bg-cream-100 p-6 text-ink">
      <h2 className="title text-choc-900">Record a brick challenge</h2>
      <p className="mt-2 text-[0.98rem]">Optional. Only for results you timed yourself.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-[0.98rem] font-extrabold">
          Nickname (optional)
          <input name="participant" maxLength={40} autoComplete="off" className="rounded-2xl border-2 border-choc-900/20 bg-cream-50 px-4 py-3 font-semibold outline-none focus:border-maroon-600" />
        </label>
        <label className="flex flex-col gap-2 text-[0.98rem] font-extrabold">
          Seconds held
          <input name="seconds" type="number" inputMode="numeric" min={0} max={600} required className="rounded-2xl border-2 border-choc-900/20 bg-cream-50 px-4 py-3 font-semibold outline-none focus:border-maroon-600" />
        </label>
      </div>
      <label className="mt-4 flex items-center gap-3 text-[1rem] font-bold">
        <input name="completed" type="checkbox" className="h-6 w-6 accent-[var(--color-maroon-600)]" />
        Completed the full 60 seconds under the rules
      </label>
      <Button type="submit" className="mt-5" disabled={pending}>
        {pending ? "Saving…" : "Save result"}
      </Button>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "mt-3 font-bold text-success-ink" : "mt-3 font-bold text-danger-ink"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
