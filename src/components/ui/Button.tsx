import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "dark" | "outline";
type Size = "md" | "lg" | "sm";

const base =
  "group/btn inline-flex select-none items-center justify-center gap-3 rounded-full text-center font-display uppercase tracking-[0.02em] transition-[transform,box-shadow,background-color,color] duration-150 ease-out disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55";

const variants: Record<Variant, string> = {
  primary:
    "bg-maroon-600 text-cream-100 shadow-[inset_0_0_0_2px_rgb(251_239_219/0.8),0_5px_0_var(--color-maroon-700)] hover:-translate-y-0.5 hover:bg-maroon-500 hover:shadow-[inset_0_0_0_2px_rgb(251_239_219/0.9),0_7px_0_var(--color-maroon-700)] active:translate-y-[3px] active:shadow-[inset_0_0_0_2px_rgb(251_239_219/0.8),0_2px_0_var(--color-maroon-700)]",
  secondary:
    "bg-cream-100 text-ink shadow-[inset_0_0_0_2px_var(--color-choc-900),0_5px_0_var(--color-cream-300)] hover:-translate-y-0.5 hover:bg-cream-50 active:translate-y-[3px] active:shadow-[inset_0_0_0_2px_var(--color-choc-900),0_2px_0_var(--color-cream-300)]",
  dark: "bg-choc-800 text-cream-100 shadow-[0_4px_0_var(--color-choc-950)] hover:-translate-y-0.5 hover:bg-choc-700 active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-choc-950)]",
  outline:
    "border-2 border-cream-100/80 text-cream-100 hover:bg-cream-100 hover:text-ink active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "min-h-10 px-4 py-2 text-[0.95rem]",
  md: "min-h-12 px-6 py-3 text-[1.1rem]",
  lg: "min-h-14 px-7 py-3.5 text-[1.25rem] md:text-[1.35rem]",
};

interface Common {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  trailing?: ReactNode;
  /** Small second line under the label (Nunito), as in the approved hero buttons. */
  subline?: string;
  className?: string;
  children: ReactNode;
}

function Inner({ icon, trailing, subline, children }: Omit<Common, "variant" | "size" | "className">) {
  return (
    <>
      {icon && <span aria-hidden className="shrink-0 [&>svg]:h-[1.15em] [&>svg]:w-[1.15em]">{icon}</span>}
      <span className="flex flex-col items-center leading-none">
        <span>{children}</span>
        {subline && (
          <span className="mt-1.5 font-sans text-[0.8125rem] font-extrabold normal-case tracking-[0.02em] opacity-90">{subline}</span>
        )}
      </span>
      {trailing && (
        <span aria-hidden className="shrink-0 transition-transform duration-150 group-hover/btn:translate-x-0.5 [&>svg]:h-[1.05em] [&>svg]:w-[1.05em]">
          {trailing}
        </span>
      )}
    </>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  icon,
  trailing,
  subline,
  children,
  ...rest
}: Common & Omit<ComponentProps<typeof Link>, "className" | "children">) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      <Inner icon={icon} trailing={trailing} subline={subline}>
        {children}
      </Inner>
    </Link>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  icon,
  trailing,
  subline,
  children,
  type = "button",
  ...rest
}: Common & Omit<ComponentProps<"button">, "className" | "children">) {
  return (
    <button type={type} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      <Inner icon={icon} trailing={trailing} subline={subline}>
        {children}
      </Inner>
    </button>
  );
}
