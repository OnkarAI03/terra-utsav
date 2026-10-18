import { cn } from "@/lib/cn";

/** A torn paper note in hand lettering, slightly rotated, as in the approved hero. */
export function PaperNote({
  children,
  className,
  rotate = -4,
  as: Tag = "p",
}: {
  children: React.ReactNode;
  className?: string;
  rotate?: number;
  as?: "p" | "div" | "h2";
}) {
  return (
    <Tag
      className={cn("paper-note hand inline-block px-5 py-4 text-[1.35rem] uppercase shadow-[0_14px_24px_-14px_rgb(10_3_2/0.9)]", className)}
      style={{ rotate: `${rotate}deg` }}
    >
      {children}
    </Tag>
  );
}
