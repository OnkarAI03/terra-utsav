"use client";

import { Lock } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Asks for the team PIN on the stall's own laptops and phone (turning stall mode on, and before
 * each "Next player"). A native modal dialog: the page behind can't be reached while it's open,
 * and Esc or a tap outside cancels.
 */
export function StallPinDialog({
  title,
  note,
  submitLabel,
  check,
  onAccepted,
  onCancel,
}: {
  title: string;
  note: string;
  submitLabel: string;
  /** Resolves to null when the PIN is right, or to what to tell the team member. */
  check: (pin: string) => Promise<string | null>;
  onAccepted: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    try {
      d.showModal();
    } catch {
      d.setAttribute("open", ""); // no modal support (old browser or test DOM): still shows the form
    }
    input.current?.focus();
    return () => {
      try {
        d.close();
      } catch {
        /* already closed */
      }
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (checking || !pin.trim()) return;
    setChecking(true);
    setProblem(null);
    const result = await check(pin);
    setChecking(false);
    if (result === null) {
      onAccepted();
      return;
    }
    setProblem(result);
    setPin("");
    input.current?.focus();
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-note`}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel(); // the backdrop
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-[var(--radius-panel)] bg-cream-100 p-0 text-ink shadow-[var(--shadow-card)] backdrop:bg-choc-950/75"
    >
      <form onSubmit={submit} className="p-7 md:p-8">
        <p className="flex items-center gap-2 text-[0.875rem] font-extrabold uppercase tracking-[0.12em] text-maroon-600">
          <Lock aria-hidden className="h-4 w-4" />
          Team only
        </p>
        <h2 id={`${id}-title`} className="mt-2 font-display text-[1.9rem] leading-tight text-choc-900">
          {title}
        </h2>
        <p id={`${id}-note`} className="mt-3 text-[1rem] leading-relaxed">
          {note}
        </p>
        <label htmlFor={`${id}-pin`} className="mt-5 block text-[0.95rem] font-extrabold">
          Team PIN
        </label>
        <input
          ref={input}
          id={`${id}-pin`}
          name="stall-pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={64}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="mt-2 w-full rounded-xl border-2 border-choc-900/15 bg-cream-50 px-4 py-3 font-display text-[1.5rem] tracking-[0.25em] text-ink outline-none transition-colors focus:border-maroon-600"
        />
        {problem && (
          <p role="alert" className="mt-3 text-[0.95rem] font-extrabold text-danger-ink">
            {problem}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={checking || !pin.trim()}>
            {checking ? "Checking…" : submitLabel}
          </Button>
          <Button variant="dark" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </dialog>
  );
}
