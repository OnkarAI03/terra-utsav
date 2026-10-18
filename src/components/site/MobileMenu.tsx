"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PawIcon } from "@/components/brand/PawIcon";
import { cn } from "@/lib/cn";
import { SECONDARY_NAV, type NavItem } from "@/lib/nav";
import { isActive } from "./NavLinks";

export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panelRef.current?.querySelector<HTMLElement>("a, button");
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>("a, button"));
        if (focusables.length === 0) return;
        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="relative z-[60] grid h-11 w-11 place-items-center rounded-full bg-cream-100 text-ink shadow-[0_4px_0_var(--color-cream-300)] transition-transform duration-150 active:translate-y-[2px]"
      >
        {open ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="festival-ground fixed inset-0 z-[55] flex flex-col overflow-y-auto px-[var(--gutter)] pb-safe pt-[calc(var(--header-h)+env(safe-area-inset-top)+12px)]"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav aria-label="Main">
              <ul className="flex flex-col gap-1">
                {items.map((item, i) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <motion.li
                      key={item.href}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.04 + i * 0.04, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center justify-between rounded-2xl px-4 py-3 font-display text-[2rem] leading-tight text-cream-100 active:bg-burgundy-800",
                          active && "text-gold-300",
                        )}
                      >
                        {item.label}
                        {active && <PawIcon className="h-6 w-6 text-gold-400" />}
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            </nav>
            <div className="mt-6 flex flex-wrap gap-3 px-4">
              <Link
                href="/#find-us"
                onClick={() => setOpen(false)}
                className="rounded-full bg-cream-100 px-5 py-3 font-extrabold text-ink"
              >
                Find Our Stall
              </Link>
              {SECONDARY_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-full border-2 border-cream-100/70 px-5 py-3 font-extrabold text-cream-100"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
