"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;

/** A form wired to a server action, with an accessible status line. */
export function AdminForm({
  action,
  children,
  submitLabel = "Save",
  className,
  variant = "primary",
  confirmText,
}: {
  action: Action;
  children?: React.ReactNode;
  submitLabel?: string;
  className?: string;
  variant?: "primary" | "dark" | "outline";
  confirmText?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  return (
    <form
      action={formAction}
      className={cn("flex flex-col gap-4", className)}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant={variant} size="sm" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <p role={state && !state.ok ? "alert" : "status"} className={cn("text-[0.95rem] font-bold", state?.ok ? "text-success-ink" : "text-danger-ink")}>
          {state?.message ?? ""}
        </p>
      </div>
    </form>
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
