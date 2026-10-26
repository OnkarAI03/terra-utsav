export interface NavItem {
  href: string;
  label: string;
}

/** Main navigation. "Meet the Team" stays a small link; the homepage is not a team directory. */
export const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/game", label: "Catch Mini" },
  { href: "/challenge", label: "Brick Challenge" },
  { href: "/team", label: "Meet the Team" },
  { href: "/feedback", label: "Feedback & Selfie" },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/rewards", label: "My prize" },
  { href: "/rules", label: "Rules" },
];
