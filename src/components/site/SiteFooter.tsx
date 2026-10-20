import Link from "next/link";
import { InstagramGlyph, instagramHandle } from "@/components/brand/InstagramLink";
import { EggCounter } from "@/components/eggs/EggCounter";
import { TicklishWordmark } from "@/components/eggs/Triggers";
import { getEventSettings, getProducts } from "@/lib/data/public";
import { MAIN_NAV, SECONDARY_NAV } from "@/lib/nav";

/** A designed close: the name returns at full width. */
export async function SiteFooter() {
  const [event, products] = await Promise.all([getEventSettings(), getProducts()]);
  // Said once here instead of a tag on every picture, and only while some picture is still not a real photo.
  const illustrative = products.filter((p) => p.imageIsIllustrative);
  const year = new Date().getFullYear();
  const eventLine = [event.festivalName, event.dateText, event.venue].filter(Boolean).join(" · ");
  return (
    <footer className="bg-night pb-safe pt-16 text-cream-100">
      <div className="shell">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))]">
          <div>
            <p className="hand text-[1.5rem] text-gold-300">Food · Diyas · Games · Chaos</p>
            <p className="mt-3 max-w-sm text-[1rem] leading-relaxed text-cream-100">
              A student Diwali stall with one original mascot, homemade diyas, one wet brick and far too much chocolate.
            </p>
            {eventLine && <p className="mt-4 max-w-sm text-[0.98rem] font-bold leading-relaxed text-cream-100">Find us at {eventLine}.</p>}
            {event.instagramUrl && (
              <a
                href={event.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2.5 rounded-full border-2 border-cream-100/70 px-4 py-2.5 font-extrabold text-cream-100 hover:bg-cream-100 hover:text-ink"
              >
                <InstagramGlyph className="h-5 w-5" />
                Follow us on Instagram · {instagramHandle(event.instagramUrl)}
              </a>
            )}
          </div>
          <nav aria-label="Footer">
            <h2 className="font-sans text-[0.95rem] font-extrabold text-gold-300">Explore</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {MAIN_NAV.filter((i) => i.href !== "/").map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-[1rem] font-semibold hover:text-gold-300">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="font-sans text-[0.95rem] font-extrabold text-gold-300">Your stuff</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {SECONDARY_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-[1rem] font-semibold hover:text-gold-300">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/staff/redeem" className="text-[1rem] font-semibold hover:text-gold-300">
                  Staff
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 overflow-hidden pb-2 pt-4">
          <TicklishWordmark />
        </div>

        <div className="mt-6">
          <EggCounter />
        </div>

        {/* pb-24 keeps the last line clear of the chat button (fixed bottom left) at the very end of the page. */}
        <div className="flex flex-col gap-2 pb-24 pt-4 text-[0.88rem] text-cream-100/85 md:flex-row md:justify-between">
          <p>© {year} TERRA UTSAV. Happy Diwali! Mini is our original mascot.</p>
          {illustrative.length > 0 && (
            <p>
              {illustrative.length === products.length ? "Food and diya pictures are" : "Some food pictures are"} illustrations of what we serve.
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
