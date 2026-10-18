"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import type { ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * A form wired to a server action, with an accessible status line. It submits through a
 * transition rather than `<form action>`, so React does not clear the fields: if a save fails,
 * everything typed is still there. Forms that add new items can ask to be cleared on success.
 */
export function AdminForm({
  action,
  children,
  submitLabel = "Save",
  className,
  variant = "primary",
  confirmText,
  resetOnSuccess = false,
}: {
  action: Action;
  children?: React.ReactNode;
  submitLabel?: string;
  className?: string;
  variant?: "primary" | "dark" | "outline";
  confirmText?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  const [, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) form.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={form}
      className={cn("flex flex-col gap-4", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmText && !window.confirm(confirmText)) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant={variant} size="sm" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <p role={state && !state.ok ? "alert" : "status"} className={cn("flex items-start gap-2 text-[0.95rem] font-bold", state?.ok ? "text-success-ink" : "text-danger-ink")}>
          {state && (state.ok ? <CircleCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /> : <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />)}
          {state && <span>{state.ok ? "Saved: " : "Not saved: "}{state.message}</span>}
        </p>
      </div>
    </form>
  );
}

/**
 * A photo picker that shrinks the picture in the browser (longest side 1600 px, WebP) before it
 * is sent, so a 5 MB phone photo uploads as a few hundred KB instead of failing.
 */
export function ImageField({ label, name, hint }: { label: string; name: string; hint?: string }) {
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    setNote(null);
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
      if (!blob) throw new Error("encode");
      const small = new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
      const dt = new DataTransfer();
      dt.items.add(small);
      input.files = dt.files;
      setNote({ ok: true, text: `Ready: ${canvas.width} × ${canvas.height}, ${Math.max(1, Math.round(small.size / 1024))} KB.` });
    } catch {
      if (file.size > 3_500_000) {
        input.value = "";
        setNote({ ok: false, text: "That photo is too big to send. Try a smaller one (under 3.5 MB)." });
      }
    }
  };

  return (
    <label className="flex flex-col gap-1.5 text-[0.95rem] font-extrabold text-ink">
      {label}
      <input name={name} type="file" accept="image/webp,image/jpeg,image/png,image/avif" onChange={(e) => void onChange(e)} className={inputClass} />
      {note && (
        <span role="status" className={cn("text-[0.875rem] font-bold", note.ok ? "text-success-ink" : "text-danger-ink")}>
          {note.text}
        </span>
      )}
      {hint && <span className="text-[0.875rem] font-semibold text-ink-soft">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border-2 border-choc-900/15 bg-cream-50 px-3.5 py-2.5 text-[1rem] text-ink outline-none transition-colors focus:border-maroon-600";

export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  hint,
  required,
  ...rest
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  hint?: string;
  required?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "name" | "type">) {
  return (
    <label className="flex flex-col gap-1.5 text-[0.95rem] font-extrabold text-ink">
      {label}
      <input name={name} type={type} defaultValue={defaultValue ?? ""} required={required} className={inputClass} {...rest} />
      {hint && <span className="text-[0.875rem] font-semibold text-ink-soft">{hint}</span>}
    </label>
  );
}

export function TextArea({ label, name, defaultValue, rows = 3, hint }: { label: string; name: string; defaultValue?: string | null; rows?: number; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-[0.95rem] font-extrabold text-ink">
      {label}
      <textarea name={name} rows={rows} defaultValue={defaultValue ?? ""} className={inputClass} />
      {hint && <span className="text-[0.875rem] font-semibold text-ink-soft">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[0.95rem] font-extrabold text-ink">
      {label}
      <select name={name} defaultValue={defaultValue ?? ""} className={inputClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Check({ label, name, defaultChecked, hint }: { label: string; name: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-3 text-[0.98rem] font-bold text-ink">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-maroon-600)]" />
      <span>
        {label}
        {hint && <span className="block text-[0.875rem] font-semibold text-ink-soft">{hint}</span>}
      </span>
    </label>
  );
}

export function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[var(--radius-card)] bg-cream-100 p-6 text-ink md:p-7", className)}>
      <h2 className="title text-choc-900">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
