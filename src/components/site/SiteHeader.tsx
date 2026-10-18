import Link from "next/link";
import { MapPin } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { MAIN_NAV } from "@/lib/nav";
import { HeaderShell } from "./HeaderShell";
import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";

export function SiteHeader() {
  return (
    <HeaderShell>
      <div className="shell flex h-[var(--header-h)] items-center justify-between gap-4">
        <Link href="/" aria-label="TERRA UTSAV home" className="relative z-[60] shrink-0 rounded-lg">
          <Wordmark size="md" />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <NavLinks items={MAIN_NAV} />
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/#find-us"
            className="hidden items-center gap-2 rounded-full border-2 border-cream-100/80 px-4 py-2 text-[0.95rem] font-extrabold text-cream-100 transition-colors duration-150 hover:bg-cream-100 hover:text-ink sm:inline-flex"
          >
            <MapPin aria-hidden className="h-4 w-4" />
            Find Our Stall
          </Link>
          <MobileMenu items={MAIN_NAV} />
        </div>
      </div>
    </HeaderShell>
  );
}
