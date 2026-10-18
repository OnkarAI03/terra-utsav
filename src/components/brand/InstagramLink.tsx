import { cn } from "@/lib/cn";

/** A simple camera glyph (drawn here; icon libraries no longer ship brand marks). */
export function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function instagramHandle(url: string): string {
  const m = url.match(/instagram\.com\/([^/?#]+)/i);
  return m ? `@${m[1]}` : "Instagram";
}

/** "Follow us on Instagram" as a pill link. Opens in a new tab. */
export function InstagramLink({ url, tone = "dark", className }: { url: string; tone?: "dark" | "light"; className?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full px-5 py-3 font-display text-[1rem] uppercase tracking-[0.02em] transition-transform duration-150 hover:-translate-y-0.5",
        tone === "dark"
          ? "border-2 border-cream-100/80 text-cream-100 hover:bg-cream-100 hover:text-ink"
          : "bg-choc-800 text-cream-100 shadow-[0_4px_0_var(--color-choc-950)]",
        className,
      )}
    >
      <InstagramGlyph className="h-5 w-5" />
      <span className="flex flex-col items-start leading-none">
        <span>Follow us on Instagram</span>
        <span className="mt-1 font-sans text-[0.8125rem] font-extrabold normal-case tracking-normal opacity-90">{instagramHandle(url)}</span>
      </span>
    </a>
  );
}
