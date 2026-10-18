"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/lib/nav";

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? "/";
  return (
    <ul className="flex items-center gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative rounded-full px-3.5 py-2 text-[0.98rem] font-bold text-cream-100/90 transition-colors duration-150 hover:text-gold-300",
                active && "text-gold-300",
              )}
            >
              {item.label}
              {active && <span aria-hidden className="absolute inset-x-3.5 -bottom-0.5 h-[3px] rounded-full bg-gold-400" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
