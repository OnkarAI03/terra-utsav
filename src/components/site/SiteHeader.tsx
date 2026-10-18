import Link from "next/link";
import { MapPin } from "lucide-react";
import { MAIN_NAV } from "@/lib/nav";
import { HeaderShell } from "./HeaderShell";
import { LogoLink } from "./LogoLink";
import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";

export function SiteHeader() {
  return (
    <HeaderShell>
      <div className="shell flex h-[var(--header-h)] items-center justify-between gap-4">
        <LogoLink />

        <nav aria-label="Main" className="hidden xl:block">
          <NavLinks items={MAIN_NAV} />
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/#find-us"
            className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full bg-cream-100 px-3.5 py-2 text-[0.95rem] font-extrabold text-ink shadow-[0_4px_0_var(--color-cream-300)] transition-transform duration-150 hover:-translate-y-0.5 sm:px-4"
          >
            <MapPin aria-hidden className="h-4 w-4" />
            <span className="hidden min-[400px]:inline">Find Our Stall</span>
            <span className="min-[400px]:hidden">Find us</span>
          </Link>
          <MobileMenu items={MAIN_NAV} />
        </div>
      </div>
    </HeaderShell>
  );
}
