import { BrickWall, CakeSlice, Flame, Gamepad2, Soup, Ticket } from "lucide-react";
import Link from "next/link";

const PLANKS = [
  { href: "/menu#chocolate-bomb", label: "Chocolate Bomb", icon: CakeSlice, tilt: -4 },
  { href: "/menu#chat-papdi", label: "Chat Papdi", icon: Soup, tilt: 3 },
  { href: "/menu#diyas", label: "Homemade Diyas", icon: Flame, tilt: -2 },
  { href: "/challenge", label: "60-Second Brick Challenge", icon: BrickWall, tilt: 3 },
  { href: "/game", label: "Fun Games", icon: Gamepad2, tilt: -3 },
  // The coupon rules, not the wallet: the wallet is a sign-in wall for a first-time visitor.
  { href: "/rules#coupons", label: "Coupons & More!", icon: Ticket, tilt: 2 },
];

/** The wooden signpost from the approved hero. Every plank is a real link. */
export function Signpost() {
  return (
    <nav aria-label="Stall attractions" className="relative w-[250px] pt-4">
      <span aria-hidden className="absolute bottom-[-120px] left-1/2 top-0 w-5 -translate-x-1/2 rounded-sm bg-wood-800 shadow-[inset_-4px_0_0_rgb(0_0_0/0.25)]" />
      <ul className="relative flex flex-col gap-2.5">
        {PLANKS.map(({ href, label, icon: Icon, tilt }) => (
          <li key={href} style={{ rotate: `${tilt}deg` }}>
            <Link
              href={href}
              className="plank group flex items-center gap-3 rounded-[10px] px-4 py-2.5 text-cream-100 transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:rotate-1 focus-visible:-translate-y-0.5"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-cream-100/80">
                <Icon aria-hidden className="h-[18px] w-[18px]" />
              </span>
              <span className="hand text-[1.15rem] leading-tight">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
