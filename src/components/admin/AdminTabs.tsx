"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/event", label: "Event" },
  { href: "/admin/menu", label: "Menu & diyas" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/game", label: "Game" },
  { href: "/admin/rewards", label: "Rewards" },
  { href: "/admin/people", label: "People & coupons" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminTabs() {
  const pathname = usePathname() ?? "/admin";
  return (
    <nav aria-label="Admin sections" className="no-scrollbar -mx-[var(--gutter)] overflow-x-auto px-[var(--gutter)]">
      <ul className="flex gap-2 pb-1">
        {TABS.map((t) => {
          const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-full px-4 py-2 text-[0.95rem] font-extrabold transition-colors",
                  active ? "bg-gold-400 text-ink" : "bg-burgundy-800 text-cream-100 hover:bg-maroon-700",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
